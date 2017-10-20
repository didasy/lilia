const db = require("../../database");
const form = require("../../form");

const httpStatus = require("http-status-codes");

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

module.exports = searchFile;
