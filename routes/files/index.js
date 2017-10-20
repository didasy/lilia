const MaxFieldsSize = 10240; // 10kB
const MaxFields = 5;

const configuration = require("../../configuration");
const middleware = require("../../middleware");
const getMain = require("./get_main");
const downloadFile = require("./download_file");
const uploadFile = require("./upload_file");
const deleteFile = require("./delete_file");
const getFile = require("./get_file");
const searchFile = require("./search_file");
const deleteFilePermanently = require("./delete_file_permanently");

const url = require("url");
const fs = require("fs");
const express = require("express");
const timeout = require("connect-timeout");
const bodyparser = require("body-parser");
const httpStatus = require("http-status-codes");
const ulid = require("ulid");
const multipart = require("connect-multiparty");

const router = express.Router();

router.get("/", timeout(configuration.app.timeout), (req, res) => {
    getMain(req, res).catch(err => {
        console.error(err.stack);
        res.status(httpStatus.INTERNAL_SERVER_ERROR).json({
            error: err.message
        });
    });
});

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

router.post(
    "/file/delete/permanent",
    middleware.apiToken,
    timeout(configuration.app.timeout),
    bodyparser.json(),
    (req, res) => {
        deleteFilePermanently(req, res).catch(err => {
            console.error(err.stack);
            res.status(httpStatus.INTERNAL_SERVER_ERROR).json({
                error: err.message
            });
        });
    }
);

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

module.exports = router;
