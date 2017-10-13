const Env = process.env.NODE_ENV;
const DefaultConfPath = process.env.CONFIG_PATH || "/configuration";
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

module.exports = conf;
