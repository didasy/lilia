const db = require("../../database");
const form = require("../../form");
const bucket = require("../../storage");

const httpStatus = require("http-status-codes");

async function deleteFile(req, res) {
    let data = form.fileDelete.validate(req.body);
    if (!data) {
        return res.status(httpStatus.BAD_REQUEST).json({
            error: "Invalid file deletion form"
        });
    }
    let requestID = data.request_id;
    delete data.request_id;

    // find the file data first
    let fileData;
    try {
        fileData = await db.file.findOne(data, { remote_file_name: 1 });
    } catch (err) {
        return res.status(httpStatus.SERVICE_UNAVAILABLE).json({
            error: err.message
        });
    }

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

    // delete from GCS
    let gcsFile = bucket.file(fileData.remote_file_name);
    try {
        await gcsFile.delete();
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

module.exports = deleteFile;
