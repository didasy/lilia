const db = require("../../database");
const configuration = require("../../configuration");
const handleUpload = require("./handle_upload");
const bucket = require("../../storage");
const getFileType = require("./get_file_type");

const fs = require("fs");
const md5 = require("md5");
const { promisify } = require("util");
const httpStatus = require("http-status-codes");
const ulid = require("ulid");

const writeFile = promisify(fs.writeFile);
const readFile = promisify(fs.readFile);

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
        handleUpload(req, res, bucket, blob, file, fileData).catch(err => {
            console.error(err.stack);
            res.status(httpStatus.INTERNAL_SERVER_ERROR).json({
                error: err.message
            });
        });
    });

    blobStream.end(fileBuf);
}

module.exports = uploadFile;
