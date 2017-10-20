function getFilenameFromUrl(file_url) {
    let arr = file_url.split("/");

    return arr[arr.length - 1];
}

module.exports = getFilenameFromUrl;
