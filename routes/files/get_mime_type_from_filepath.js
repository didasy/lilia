const fileType = require("file-type");
const readChunk = require("read-chunk");

async function getMIMETypeFromFilepath(filePath) {
    let chunk = await readChunk(filePath, 0, 4096);

    return fileType(chunk).mime;
}

module.exports = getMIMETypeFromFilepath;
