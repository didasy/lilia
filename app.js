const configuration = require("./configuration");
const routes = require("./routes");

const morgan = require("morgan");
const express = require("express");

const app = express();
app.use(morgan("combined"));
app.use(routes.files);

app.listen(configuration.app.port, err => {
    if (err) {
        console.error(err.stack);
        process.exit(1);
    }

    console.info("Lilia is serving at port:", configuration.app.port);
});
