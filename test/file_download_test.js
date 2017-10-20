const configuration = require("../configuration");
const db = require("../database");
const bucket = require("../storage");

const chakram = require("chakram");
const expect = chakram.expect;
const ulid = require("ulid");
const isUrl = require("is-url");

const fileURL = "http://placehold.it/10x10";
const requestID = ulid();
const fileMimeType = "image/png";
const fileType = "image";

describe("/file/download POST", () => {
    let response = chakram.request(
        "POST",
        "http://localhost:9000/file/download",
        {
            headers: {
                api_token: configuration.app.api_token
            },
            body: {
                request_id: requestID,
                file_url: fileURL
            },
            json: true
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
            file_mime_type: fileMimeType,
            file_type: fileType,
            deleted_at: null,
            deletion_request_id: null
        });

        return chakram.wait();
    });

    it("Should have correct file_md5", () => {
        expect(response).to.have.json("file_md5", md5 => {
            expect(md5).to.be.a("string");
            expect(md5).to.have.lengthOf(32);
        });

        return chakram.wait();
    });

    it("Should have correct file_size", () => {
        expect(response).to.have.json("file_size", fileSize => {
            expect(fileSize).to.be.a("number");
            expect(fileSize).to.be.at.least(1);
        });

        return chakram.wait();
    });

    it("Should have correct file_name", () => {
        expect(response).to.have.json("file_name", name => {
            expect(name).to.be.a("string");
            expect(name).to.include("");
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
            expect(name).to.include("10x10");
        });

        return chakram.wait();
    });

    it("Should have correct original_file_url", () => {
        expect(response).to.have.json("original_file_url", url => {
            expect(url).to.be.a("string");
            expect(url).to.include("10x10");
            expect(isUrl(url)).to.be.true;
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
                        request_id: requestID
                    },
                    {
                        file_url: 1
                    }
                );
                let arr = file.file_url.split("/");
                let remoteFileName = arr[arr.length - 1];

                await db.file.remove({
                    request_id: requestID
                });

                await bucket.file(remoteFileName).delete();
            })()
        ]);
    });
});
