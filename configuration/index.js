const Version = process.env.VERSION;
const Env = process.env.NODE_ENV;
const DefaultConfPath = process.env.CONFIG_PATH || "/configuration";
const DefaultViewFilePath = "view/index.html";
const DefaultLogPath = "/log";
const DefaultTmpPath = "/tmp";
const DefaultPort = 9000;
const Development = "development.toml";
const Staging = "staging.toml";
const Production = "production.toml";

const fs = require("fs");
const path = require("path");
const toml = require("toml");

var conf = {};

try {
    switch (Env) {
        case "production":
            conf = toml.parse(
                fs.readFileSync(path.join(DefaultConfPath, Production))
            );
            break;
        case "staging":
            conf = toml.parse(
                fs.readFileSync(path.join(DefaultConfPath, Staging))
            );
            break;
        default:
            conf = toml.parse(
                fs.readFileSync(path.join(DefaultConfPath, Development))
            );
    }
} catch (err) {
    console.error(err.stack);
    process.exit(1);
}

conf.app.version = Version; // Version
if (typeof conf.app.upload.page_html != "string") {
    conf.app.upload.page_html = DefaultViewFilePath; // View HTML file
}
if (typeof conf.app.log_path != "string") {
    conf.app.log_path = DefaultLogPath;
}
if (typeof conf.app.upload.dirname != "string") {
    conf.app.upload.dirname = DefaultTmpPath;
}
if (typeof conf.app.port != "number") {
    if (conf.app.port < 1 || conf.app.port > 65535) {
        conf.app.port = DefaultPort;
    }
}

module.exports = conf;
