const MaxFieldsSize = 10240; // 10kB
const MaxFields = 5;

const configuration = require("../configuration");
const form = require("../form");
const FileModel = require("../model/file");
const middleware = require("../middleware");

const url = require("url");
const path = require("path");
const fs = require("fs");
const { promisify } = require("util");
const express = require("express");
const mongoist = require("mongoist");
const timeout = require("connect-timeout");
const bodyparser = require("body-parser");
const multipart = require("connect-multiparty");
const httpStatus = require("http-status-codes");
const Storage = require("@google-cloud/storage");
const ulid = require("ulid");
const md5 = require("md5");
const axios = require("axios");
const isUrl = require("is-url");
const fileType = require("file-type");
const readChunk = require("read-chunk");

const storage = Storage({
    projectId: configuration.gcs.options.project_id,
    keyFilename: configuration.gcs.options.key_filename
});
const bucket = storage.bucket(configuration.gcs.bucket);
const router = express.Router();
const db = mongoist(
    configuration.database.connection_string,
    configuration.database.connection_options
);
const readFile = promisify(fs.readFile);
const writeFile = promisify(fs.writeFile);

router.get("/", timeout(configuration.app.timeout), (req, res) => {
    getMain(req, res).catch(err => {
        console.error(err.stack);
        res.status(httpStatus.INTERNAL_SERVER_ERROR).json({
            error: err.message
        });
    });
});

async function getMain(req, res) {
    res.json({
        service: "Lilia",
        version: configuration.app.version
    });
}

router.post(
    "/file/download",
    middleware.apiToken,
    timeout(configuration.app.upload.timeout),
    bodyparser.json(),
    (req, res) => {
        downloadFile(req, res).catch(err => {
            console.error(err.stack);
            res.status(httpStatus.INTERNAL_SERVER_ERROR).json({
                error: err.message
            });
        });
    }
);

async function downloadFile(req, res) {
    let fileData = {
        request_id: req.body.request_id,
        file_url: req.body.file_url,
        created_at: new Date(),
        deleted_at: null,
        deletion_request_id: null
    };

    // check if url is valid
    if (!isUrl(fileData.file_url)) {
        return res.status(httpStatus.BAD_REQUEST).json({
            error: "file_url is not a valid URL"
        });
    }

    // Download the file
    let download = await axios.get(fileData.file_url, {
        responseType: "arraybuffer"
    });
    // check the md5
    fileData.file_md5 = md5(download.data);

    // proceed with the uploading process
    // check if already exists
    let exists;
    try {
        exists = await db.file.findOne(
            { file_md5: fileData.file_md5 },
            { file_url: 1, deleted_at: 1 }
        );
    } catch (err) {
        return res.status(httpStatus.SERVICE_UNAVAILABLE).json({
            error: err.message
        });
    }
    if (exists) {
        if (exists.deleted_at != null) {
            let data;
            try {
                await db.file.update(
                    { file_md5: fileData.file_md5 },
                    { $set: { deleted_at: null, deletion_request_id: null } }
                );
                data = await db.file.findOne({ file_md5: fileData.file_md5 });
            } catch (err) {
                return res.status(httpStatus.SERVICE_UNAVAILABLE).json({
                    error: err.message
                });
            }
            if (!data) {
                return res.status(httpStatus.NOT_FOUND).json({
                    error: `File with md5 of ${fileData.file_md5} not found`
                });
            }
            delete data._id;
            return res.json(data);
        }
        return res.status(httpStatus.CONFLICT).json({
            error: `File with md5 ${fileData.file_md5} already exists as ${exists.file_url}`
        });
    }

    fileData.file_size = Buffer.byteLength(download.data);

    // write to temporary dir
    let tmpPath = path.join(configuration.app.upload.dirname, ulid());
    await writeFile(tmpPath, download.data);

    fileData.file_mime_type = await getMIMETypeFromFilepath(tmpPath);

    fileData.file_type = getFileType(fileData.file_mime_type);
    if (!fileData.file_type) {
        return res.status(httpStatus.BAD_REQUEST).json({
            error: "File is not a media"
        });
    }

    fileData.file_name = getFilenameFromUrl(fileData.file_url);

    let fileBuf = await readFile(tmpPath);

    // write to GCS
    const fileName = Date.now() + "-" + fileData.file_name;
    const blob = bucket.file(fileName);
    const blobStream = blob.createWriteStream({
        metadata: {
            contentType: fileData.file_mime_type,
            size: fileData.file_size
        }
    });

    blobStream.on("error", err => {
        console.error(err.stack);
        res.status(httpStatus.INTERNAL_SERVER_ERROR).json({
            error: err.message
        });
    });

    blobStream.on("finish", () => {
        handleUpload(
            req,
            res,
            bucket,
            blob,
            { path: tmpPath },
            fileData
        ).catch(err => {
            console.error(err.stack);
            res.status(httpStatus.INTERNAL_SERVER_ERROR).json({
                error: err.message
            });
        });
    });

    blobStream.end(fileBuf);
}

async function getMIMETypeFromFilepath(filePath) {
    let chunk = await readChunk(filePath, 0, 4096);

    return fileType(chunk).mime;
}

function getFilenameFromUrl(file_url) {
    let arr = file_url.split("/");

    return arr[arr.length - 1];
}

const indexPage = fs.readFileSync(configuration.app.upload.page_html, "utf8");
const uploadUrl = url.resolve(
    configuration.app.upload.base_url,
    "/file/upload"
);
router.get("/file/upload", timeout(configuration.app.timeout), (req, res) => {
    let requestID = ulid();
    let page = indexPage;
    page = page.replace("${request_id}", requestID);
    page = page.replace("${upload_url}", uploadUrl);
    page = page.replace("${api_token}", configuration.app.api_token);

    res.set({ "Content-Type": "text/html" }).send(page);
});

router.post(
    "/file/upload",
    middleware.apiToken,
    timeout(configuration.app.upload.timeout),
    multipart({
        maxFieldsSize: MaxFieldsSize,
        maxFields: MaxFields,
        uploadDir: configuration.app.dirname,
        maxFilesSize: configuration.app.max_file_size
    }),
    (req, res) => {
        uploadFile(req, res).catch(err => {
            console.error(err.stack);
            res.status(httpStatus.INTERNAL_SERVER_ERROR).json({
                error: err.message
            });
        });
    }
);

async function uploadFile(req, res) {
    let file = req.files.media;

    let fileData = {
        request_id: req.body.request_id,
        file_name: req.files.media.originalFilename,
        file_mime_type: req.files.media.type,
        created_at: new Date(),
        file_size: req.files.media.size,
        deleted_at: null,
        deletion_request_id: null
    };

    // get md5
    let fileBuf = await readFile(req.files.media.path);
    fileData.file_md5 = md5(fileBuf);

    // check if already exists
    let exists;
    try {
        exists = await db.file.findOne(
            { file_md5: fileData.file_md5 },
            { file_url: 1, deleted_at: 1 }
        );
    } catch (err) {
        return res.status(httpStatus.SERVICE_UNAVAILABLE).json({
            error: err.message
        });
    }
    if (exists) {
        if (exists.deleted_at != null) {
            let data;
            try {
                await db.file.update(
                    { file_md5: fileData.file_md5 },
                    { $set: { deleted_at: null, deletion_request_id: null } }
                );
                data = await db.file.findOne({ file_md5: fileData.file_md5 });
            } catch (err) {
                return res.status(httpStatus.SERVICE_UNAVAILABLE).json({
                    error: err.message
                });
            }
            if (!data) {
                return res.status(httpStatus.NOT_FOUND).json({
                    error: `File with md5 of ${fileData.file_md5} not found`
                });
            }
            delete data._id;
            return res.json(data);
        }
        return res.status(httpStatus.CONFLICT).json({
            error: `File with md5 ${fileData.file_md5} already exists as ${exists.file_url}`
        });
    }

    // get file type based on mime
    fileData.file_type = getFileType(fileData.file_mime_type);
    if (!fileData.file_type) {
        return res.status(httpStatus.BAD_REQUEST).json({
            error: "File is not a media"
        });
    }

    // upload the file to GCS
    const fileName = Date.now() + "-" + fileData.file_name;
    const blob = bucket.file(fileName);
    const blobStream = blob.createWriteStream({
        metadata: {
            contentType: fileData.file_mime_type,
            size: fileData.file_size
        }
    });

    blobStream.on("error", err => {
        console.error(err.stack);
        res.status(httpStatus.INTERNAL_SERVER_ERROR).json({
            error: err.message
        });
    });

    blobStream.on("finish", () => {
        handleUpload(req, res, bucket, blob, file, fileData).catch(err => {
            console.error(err.stack);
            res.status(httpStatus.INTERNAL_SERVER_ERROR).json({
                error: err.message
            });
        });
    });

    blobStream.end(fileBuf);
}

function getFileType(mime) {
    let fileType = mime.replace(/\/.+/, "");
    switch (fileType) {
        case "image":
        case "video":
        case "audio":
        case "text":
            break;
        default:
            fileType = null;
    }

    return fileType;
}

async function handleUpload(req, res, bucket, blob, file, fileData) {
    let publicUrl = `https://storage.googleapis.com/${bucket.name}/${blob.name}`;
    await blob.makePublic();
    fileData.file_url = publicUrl;

    let data = new FileModel(fileData);
    let err = data.validate();
    if (err) {
        return res.status(httpStatus.INTERNAL_SERVER_ERROR).json({
            errors: err
        });
    }
    data = data.getAll();

    try {
        await db.file.insert(data);
    } catch (err) {
        return res.status(httpStatus.SERVICE_UNAVAILABLE).json({
            error: err.message
        });
    }

    delete data._id;
    res.json(data);

    fs.unlink(file.path, err => {
        if (err) {
            console.error(err.stack);
        }
    });
}

router.post(
    "/file/delete",
    middleware.apiToken,
    timeout(configuration.app.timeout),
    bodyparser.json(),
    (req, res) => {
        deleteFile(req, res).catch(err => {
            console.error(err.stack);
            res.status(httpStatus.INTERNAL_SERVER_ERROR).json({
                error: err.message
            });
        });
    }
);

async function deleteFile(req, res) {
    let data = form.fileDelete.validate(req.body);
    if (!data) {
        return res.status(httpStatus.BAD_REQUEST).json({
            error: "Invalid file deletion form"
        });
    }
    let requestID = data.request_id;
    delete data.request_id;

    let deletionTime = new Date();

    // set deleted_at and deletion_request_id
    try {
        await db.file.update(data, {
            $set: {
                deletion_request_id: requestID,
                deleted_at: deletionTime
            }
        });
    } catch (err) {
        return res.status(httpStatus.SERVICE_UNAVAILABLE).json({
            error: err.message
        });
    }

    res.json({
        deleted_at: deletionTime,
        deletion_request_id: requestID
    });
}

router.post(
    "/file/get",
    middleware.apiToken,
    timeout(configuration.app.timeout),
    bodyparser.json(),
    (req, res) => {
        getFile(req, res).catch(err => {
            console.error(err.stack);
            res.status(httpStatus.INTERNAL_SERVER_ERROR).json({
                error: err.message
            });
        });
    }
);

async function getFile(req, res) {
    let data = form.fileGet.validate(req.body);
    if (!data) {
        return res.status(httpStatus.BAD_REQUEST).json({
            error: "Invalid file get form"
        });
    }
    let requestID = data.request_id;
    delete data.request_id;

    let fileData = null;
    try {
        fileData = await db.file.findOne(data);
    } catch (err) {
        return res.status(httpStatus.SERVICE_UNAVAILABLE).json({
            error: err.message
        });
    }
    if (!fileData) {
        return res.status(httpStatus.NOT_FOUND).json({
            error: "File not found"
        });
    }

    delete fileData._id;
    res.json(fileData);
}

router.post(
    "/file/search",
    middleware.apiToken,
    timeout(configuration.app.timeout),
    bodyparser.json(),
    (req, res) => {
        searchFile(req, res).catch(err => {
            console.error(err.stack);
            res.status(httpStatus.INTERNAL_SERVER_ERROR).json({
                error: err.message
            });
        });
    }
);

async function searchFile(req, res) {
    let data = form.fileSearch.validate(req.body);
    if (!data) {
        return res.status(httpStatus.BAD_REQUEST).json({
            error: "Invalid file search form"
        });
    }
    let searchParams = {
        limit: data.per_page,
        skip: data.page,
        sort: data.sort
    };
    delete data.request_id;
    delete data.per_page;
    delete data.page;
    delete data.sort;

    console.log(data);

    let files = [];
    try {
        files = await db.file
            .findAsCursor(data)
            .sort(searchParams.sort)
            .skip(searchParams.skip)
            .limit(searchParams.limit)
            .toArray();
    } catch (err) {
        return res.status(httpStatus.SERVICE_UNAVAILABLE).json({
            error: err.message
        });
    }

    files = files.map(f => {
        delete f._id;
        return f;
    });
    res.json(files);
}

module.exports = router;
