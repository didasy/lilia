function getFileType(mime) {
    let fileType = mime.replace(/\/.+/, "");
    switch (fileType) {
        case "image":
        case "video":
        case "audio":
        case "text":
            break;
        default:
            fileType = null;
    }

    return fileType;
}

module.exports = getFileType;
