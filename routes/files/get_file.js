const db = require("../../database");
const form = require("../../form");

const httpStatus = require("http-status-codes");

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

module.exports = getFile;
