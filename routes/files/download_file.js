const configuration = require("../../configuration");
const db = require("../../database");
const getFilenameFromUrl = require("./get_filename_from_url");
const getFileType = require("./get_file_type");
const getMIMETypeFromFilepath = require("./get_mime_type_from_filepath");
const bucket = require("../../storage");
const handleUpload = require("./handle_upload");

const isUrl = require("is-url");
const fs = require("fs");
const httpStatus = require("http-status-codes");
const axios = require("axios");
const md5 = require("md5");
const path = require("path");
const { promisify } = require("util");
const ulid = require("ulid");

const writeFile = promisify(fs.writeFile);
const readFile = promisify(fs.readFile);

async function downloadFile(req, res) {
    let fileData = {
        request_id: req.body.request_id,
        file_url: req.body.file_url,
        original_file_url: req.body.file_url,
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
    const fileName = ulid() + "-" + Date.now() + "-" + fileData.file_name;
    const blob = bucket.file(fileName);
    const blobStream = blob.createWriteStream({
        metadata: {
            contentType: fileData.file_mime_type,
            size: fileData.file_size
        }
    });

    fileData.remote_file_name = fileName;

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

module.exports = downloadFile;
