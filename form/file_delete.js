const isUrl = require("is-url");

const validate = data => {
    // request_id
    // file_md5
    // file_url
    // file_name
    if (typeof data.request_id != "string") {
        return null;
    }
    if (data.request_id.length < 1) {
        return null;
    }

    if (data.file_md5) {
        if (typeof data.file_md5 != "string") {
            return null;
        }
        if (data.file_md5.length != 32) {
            return null;
        }
    }

    if (data.file_url) {
        if (typeof data.file_url != "string") {
            return null;
        }
        if (isUrl(data.file_url)) {
            return null;
        }
    }

    if (data.file_name) {
        if (typeof data.file_name != "string") {
            return null;
        }
        if (data.file_name.length < 1) {
            return null;
        }
    }

    data.deleted_at = null;

    return data;
};

module.exports = {
    validate: validate
};
