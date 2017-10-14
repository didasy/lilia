const configuration = require("./configuration");
const routes = require("./routes");
const middleware = require("./middleware");

const fs = require("fs");
const https = require("https");
const morgan = require("morgan");
const express = require("express");

const app = express();
app.use(morgan("combined"));
app.use(middleware.apiToken);
app.use(routes.files);

if (configuration.app.secure) {
    let options = {
        key: fs.readFileSync(configuration.app.security.key),
        cert: fs.readFileSync(configuration.app.security.cert)
    };
    https.createServer(options, app).listen(configuration.app.port, err => {
        if (err) {
            console.error(err.stack);
            process.exit(1);
        }

        console.info(
            "Lilia is serving securely at port:",
            configuration.app.port
        );
    });
} else {
    app.listen(configuration.app.port, err => {
        if (err) {
            console.error(err.stack);
            process.exit(1);
        }

        console.info("Lilia is serving at port:", configuration.app.port);
    });
}
