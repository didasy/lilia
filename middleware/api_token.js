const configuration = require("../configuration");

const httpStatus = require("http-status-codes");

function apiToken(req, res, next) {
    if (!typeof configuration.app.api_token == "string") {
        return next();
    }
    if (configuration.app.api_token === req.get("api_token")) {
        return next();
    }

    res
        .status(httpStatus.UNAUTHORIZED)
        .json({ error: "Invalid api_token header" });
}

module.exports = apiToken;
