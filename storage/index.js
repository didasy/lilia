const configuration = require("../configuration");

const Storage = require("@google-cloud/storage");

const storage = Storage({
    projectId: configuration.gcs.options.project_id,
    keyFilename: configuration.gcs.options.key_filename
});
const bucket = storage.bucket(configuration.gcs.bucket);

module.exports = bucket;
