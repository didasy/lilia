const configuration = require("../configuration");
const db = require("../database");
const bucket = require("../storage");

const chakram = require("chakram");
const expect = chakram.expect;
const fs = require("fs");
const ulid = require("ulid");
const md5 = require("md5");
const isUrl = require("is-url");

const fileStream = fs.createReadStream(__dirname + "/example.png");
const exampleFile = fs.readFileSync(__dirname + "/example.png");
const requestID = ulid();
const fileMD5 = md5(exampleFile);
const fileSize = exampleFile.byteLength;
const fileMimeType = "image/png";
const fileType = "image";

describe("/file/upload POST", () => {
    let response = chakram.request(
        "POST",
        "http://localhost:9000/file/upload",
        {
            headers: {
                api_token: configuration.app.api_token
            },
            formData: {
                media: fileStream,
                request_id: requestID
            }
        }
    );

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
            request_id: requestID,
            file_md5: fileMD5,
            file_size: fileSize,
            file_mime_type: fileMimeType,
            file_type: fileType,
            deleted_at: null,
            deletion_request_id: null
        });

        return chakram.wait();
    });

    it("Should have correct file_name", () => {
        expect(response).to.have.json("file_name", name => {
            expect(name).to.be.a("string");
            expect(name).to.include("example.png");
        });

        return chakram.wait();
    });

    it("Should have correct file_url", () => {
        expect(response).to.have.json("file_url", url => {
            expect(url).to.be.a("string");
            expect(isUrl(url)).to.be.true;
        });

        return chakram.wait();
    });

    it("Should have correct remote_file_name", () => {
        expect(response).to.have.json("remote_file_name", name => {
            expect(name).to.be.a("string");
            expect(name).to.include("example.png");
        });

        return chakram.wait();
    });

    it("Should have correct created_at", () => {
        expect(response).to.have.json("created_at", createdAt => {
            createdAt = new Date(createdAt);
            expect(createdAt).to.be.a("date");
            expect(createdAt).to.be.below(new Date());
        });

        return chakram.wait();
    });

    after("Delete the file", () => {
        return chakram.waitFor([
            (async function del() {
                let file = await db.file.findOne(
                    {
                        file_md5: fileMD5
                    },
                    {
                        file_url: 1
                    }
                );
                let arr = file.file_url.split("/");
                let remoteFileName = arr[arr.length - 1];

                await db.file.remove({
                    file_md5: fileMD5
                });

                await bucket.file(remoteFileName).delete();
            })()
        ]);
    });
});
