const configuration = require("../configuration");
const db = require("../database");
const bucket = require("../storage");

const chakram = require("chakram");
const expect = chakram.expect;
const fs = require("fs");
const ulid = require("ulid");

const remoteFileName = ulid() + "-" + Date.now() + "-example.png";
const file = {
    requestID: ulid(),
    url: "http://example.com/" + remoteFileName,
    md5: "12345678901234567890123456789012",
    name: "example.png",
    data: fs.readFileSync(__dirname + "/example.png"),
    mime: "image/png",
    type: "image",
    size: 2479,
    createdAt: new Date()
};

const insertionData = {
    request_id: file.requestID,
    file_name: file.name,
    file_size: file.size,
    file_md5: file.md5,
    file_mime_type: file.mime,
    file_type: file.type,
    file_url: file.url,
    remote_file_name: remoteFileName,
    created_at: file.createdAt,
    deleted_at: null,
    deletion_request_id: null
};

describe("/file/delete POST", () => {
    let response;

    before("Prepare the file", done => {
        const blob = bucket.file(remoteFileName);
        const blobStream = blob.createWriteStream({
            metadata: {
                contentType: file.mime,
                size: file.size
            }
        });

        blobStream.on("error", err => {
            throw err;
        });

        blobStream.on("finish", () => {
            (async function insert() {
                await db.file.insert(insertionData);

                response = chakram.request(
                    "POST",
                    "http://localhost:9000/file/delete",
                    {
                        headers: {
                            api_token: configuration.app.api_token
                        },
                        body: {
                            request_id: file.requestID,
                            file_url: file.url,
                            file_md5: file.md5,
                            file_name: file.name
                        },
                        json: true
                    }
                );

                done();
            })().catch(err => {
                throw err;
            });
        });

        blobStream.end(file.data);
    });

    it("Should return HTTP status 200", () => {
        expect(response).to.have.status(200);

        return chakram.wait();
    });

    it("Should bear application/json header", () => {
        expect(response).to.have.header("content-type", /application\/json/);

        return chakram.wait();
    });

    it("Should return expected JSON", () => {
        expect(response).to.comprise.of.json({
            deletion_request_id: file.requestID
        });

        expect(response).to.have.json("deleted_at", deletedAt => {
            deletedAt = new Date(deletedAt);
            expect(deletedAt).to.be.a("date");
            expect(deletedAt).to.be.below(new Date());
        });

        return chakram.wait();
    });

    it("Should set deleted_at and deletion_request_id in database", () => {
        return chakram.waitFor([
            (async function check() {
                let data = await db.file.findOne(
                    {
                        file_md5: file.md5
                    },
                    {
                        deleted_at: 1,
                        deletion_request_id: 1
                    }
                );

                expect(data.deleted_at).to.be.a("date");
                expect(data.deleted_at).to.be.below(new Date());

                expect(data.deletion_request_id).to.be.a("string");
                expect(data.deletion_request_id).to.be.equal(file.requestID);
            })()
        ]);
    });

    after("Delete the file", () => {
        return chakram.waitFor([
            (async function del() {
                await db.file.remove({
                    file_md5: file.md5
                });

                await bucket.file(remoteFileName).delete();
            })()
        ]);
    });
});
