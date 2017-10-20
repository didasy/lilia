const configuration = require("../../configuration");

async function getMain(req, res) {
    res.json({
        service: "Lilia",
        version: configuration.app.version
    });
}

module.exports = getMain;
