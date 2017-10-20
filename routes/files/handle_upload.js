const db = require("../../database");
const FileModel = require("../../model/file");

const fs = require("fs");
const httpStatus = require("http-status-codes");

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

module.exports = handleUpload;
