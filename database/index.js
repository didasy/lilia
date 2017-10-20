const configuration = require("../configuration");

const mongoist = require("mongoist");

const db = mongoist(
    configuration.database.connection_string,
    configuration.database.connection_options
);

module.exports = db;
