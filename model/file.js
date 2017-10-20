const isUrl = require("is-url");

/**
    request_id: "" // Preferably ULID and must be unique
    file_name: "" // Max 256 characters
    file_url: ""
    file_size: 0
    file_md5: "" // Must be 32 characters and must be unique
    file_mime_type: "" // Max 24 characters
    file_type: "" // image, audio, video, text
    created_at: null
    deleted_at: null
    deletion_request_id: null
*/

class FileModel {
    constructor(data) {
        this.request_id = data.request_id || "";
        this.file_name = data.file_name || "";
        this.file_url = data.file_url || "";
        this.file_size = data.file_size || 0;
        this.file_md5 = data.file_md5 || "";
        this.file_mime_type = data.file_mime_type || "";
        this.file_type = data.file_type || "";
        this.created_at = data.created_at || new Date();
        this.deleted_at = data.deleted_at || null;
        this.deletion_request_id = data.deletion_request_id || null;
        this.remote_file_name = data.remote_file_name || null;
        this.original_file_url = data.original_file_url || null;
    }

    getAll() {
        let data = this;

        return {
            request_id: data.request_id,
            file_name: data.file_name,
            file_url: data.file_url,
            file_size: data.file_size,
            file_md5: data.file_md5,
            file_mime_type: data.file_mime_type,
            file_type: data.file_type,
            created_at: data.created_at,
            deleted_at: data.deleted_at,
            deletion_request_id: data.deletion_request_id,
            remote_file_name: data.remote_file_name,
            original_file_url: data.original_file_url
        };
    }

    // Will return null if no error
    // Will return an array of errors if it has errors
    validate() {
        let data = this;
        let err = [];
        if (typeof data.request_id != "string") {
            err.push("request_id must be string");
        }
        if (data.request_id.length < 1) {
            err.push("request_id cannot be empty");
        }
        if (typeof data.file_name != "string") {
            err.push("file_name must be string");
        }
        if (data.file_name.length > 256) {
            err.push("file_name length cannot be more than 256 characters");
        }
        if (data.file_name.length < 1) {
            err.push("file_name length cannot be less than 1 characters");
        }
        if (typeof data.file_md5 != "string") {
            err.push("file_md5 must be string");
        }
        if (data.file_md5.length != 32) {
            err.push("file_md5 length must be 32 characters");
        }
        if (typeof data.file_mime_type != "string") {
            err.push("file_mime_type must be string");
        }
        if (data.file_mime_type > 24) {
            err.push("file_mime_type length cannot be more than 24 characters");
        }
        if (data.file_mime_type < 3) {
            err.push("file_mime_type length cannot be less than 3 characters");
        }
        if (!(data.created_at instanceof Date)) {
            err.push("created_at must be a Date instance");
        }
        switch (data.file_type) {
            case "image":
            case "audio":
            case "video":
            case "text":
                break;
            default:
                err.push("file_type must be image, audio, video, or text");
        }
        if (data.deleted_at != null) {
            if (data.deleted_at instanceof Date) {
                err.push("deleted_at must be a Date instance");
            }
        }
        if (data.deletion_request_id != null) {
            if (typeof data.deletion_request_id != "string") {
                err.push("file_deletion_request_id must be string");
            }
        }

        if (typeof data.remote_file_name == "string") {
            if (data.remote_file_name.length < 1) {
                err.push("remote_file_name cannot be less than 1 character");
            }
        }

        if (typeof data.original_file_url == "string") {
            if (!isUrl(data.original_file_url)) {
                err.push("original_file_url must be a correct url");
            }
        }

        if (err.length < 1) {
            err = null;
        }

        return err;
    }
}

module.exports = FileModel;
