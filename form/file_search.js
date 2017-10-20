const isUrl = require("is-url");

const ValidSort = [
    "created_at",
    "file_size",
    "file_mime_type",
    "file_type",
    "request_id",
    "file_name"
];

const isUrl = require("is-url");

const validate = data => {
    // request_id
    // page
    // per_page
    // sort
    // created_from
    // created_to
    // is_deleted
    // by_request_id
    // by_deletion_request_id
    // file_name
    // file_mime_type
    // file_type
    // file_size_from
    // file_size_to
    // remote_file_name
    // original_file_url
    if (typeof data.request_id != "string") {
        return null;
    }
    if (data.request_id.length < 1) {
        return null;
    }

    if (typeof data.per_page != "number") {
        data.per_page = 10;
    }
    if (data.per_page < 1) {
        data.per_page = 1;
    }

    // request page start from 1 while <1 is treated as page 1
    if (typeof data.page != "number" || data.page < 0) {
        data.page = 0;
    } else {
        data.page = (data.page - 1) * data.per_page;
    }

    if (!data.sort) {
        data.sort = { created_at: -1 };
    } else {
        let keys = Object.keys(data.sort);
        for (let i = 0; i < keys.length; i++) {
            let found = false;
            for (let j = 0; j < ValidSort.length; j++) {
                if (keys[i] == ValidSort[j]) {
                    found = true;
                    break;
                }
            }
            if (!found) {
                delete data.sort[keys[i]];
                continue;
            }
        }

        for (let key in data.sort) {
            if (data.sort[key] > 0) {
                data.sort[key] = 1;
            }
            if (data.sort[key] < 1) {
                data.sort[key] = -1;
            }
        }
    }

    if (data.created_from instanceof Date) {
        if (data.created_to instanceof Date) {
            if (data.created_to.getTime() < data.created_from.getTime()) {
                delete data.created_to;
                data.created_at = {
                    $gte: data.created_from,
                    $lte: data.created_to
                };
            } else {
                data.created_at = {
                    $gte: data.created_from
                };
            }
        } else {
            delete data.created_to;
            data.created_at = {
                $gte: data.created_from
            };
        }
    }

    if (data.created_to instanceof Date) {
        if (data.created_from instanceof Date) {
            if (data.created_from.getTime() > data.created_to.getTime()) {
                delete data.created_from;
                data.created_at = {
                    $gte: data.created_from,
                    $lte: data.created_to
                };
            } else {
                data.created_at = {
                    $lte: data.created_to
                };
            }
        } else {
            delete data.created_from;
            data.created_at = {
                $lte: data.created_to
            };
        }
    }

    delete data.created_from;
    delete data.created_to;

    if (typeof data.is_deleted != "boolean") {
        delete data.is_deleted;
    }

    if (typeof data.by_request_id != "string") {
        delete data.by_request_id;
    } else {
        if (data.by_request_id.length < 1) {
            delete data.by_request_id;
        } else {
            data.request_id = data.by_request_id;
        }
    }
    delete data.by_request_id;

    if (typeof data.by_deletion_request_id != "string") {
        delete data.by_deletion_request_id;
    } else {
        if (data.by_deletion_request_id.length < 1) {
            delete data.by_deletion_request_id;
        } else {
            data.deletion_request_id = data.by_deletion_request_id;
        }
    }
    delete data.by_deletion_request_id;

    if (typeof data.file_name != "string") {
        delete data.file_name;
    } else {
        if (data.file_name.length < 1) {
            delete data.file_name;
        }
    }

    if (typeof data.file_mime_type != "string") {
        delete data.file_mime_type;
    } else {
        if (data.file_mime_type.length < 1) {
            delete data.file_mime_type;
        }
    }

    if (typeof data.file_type != "string") {
        delete data.file_type;
    } else {
        if (data.file_type.length < 1) {
            delete data.file_type;
        }
    }

    if (typeof data.file_size_from == "number") {
        if (typeof data.file_size_to == "number") {
            if (data.file_size_to < data.file_size_from) {
                delete data.file_size_to;
                data.file_size = {
                    $gte: data.file_size_from
                };
            } else {
                data.file_size = {
                    $gte: data.file_size_from,
                    $lte: data.file_size_to
                };
            }
        } else {
            delete data.file_size_to;
            data.file_size = {
                $gte: data.file_size_from
            };
        }
    }

    if (typeof data.file_size_to == "number") {
        if (typeof data.file_size_from == "number") {
            if (data.file_size_from > data.file_size_to) {
                delete data.file_size_from;
                data.file_size = {
                    $lte: data.file_size_to
                };
            } else {
                data.file_size = {
                    $gte: data.file_size_from,
                    $lte: data.file_size_to
                };
            }
        } else {
            delete data.file_size_from;
            data.file_size = {
                $lte: data.file_size_to
            };
        }
    }

    delete data.file_size_from;
    delete data.file_size_to;

    if (typeof data.remote_file_name == "string") {
        if (data.remote_file_name.length < 1) {
            delete data.remote_file_name;
        }
    }

    if (typeof data.original_file_url == "string") {
        if (!isUrl(data.original_file_url)) {
            delete data.original_file_url;
        }
    }

    data.deleted_at = null;

    return data;
};

module.exports = {
    validate: validate
};
