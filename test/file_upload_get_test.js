const configuration = require("../configuration");

const chakram = require("chakram");
const expect = chakram.expect;

describe("/file/upload GET", () => {
    let response = chakram.get("http://localhost:9000/file/upload");

    it("Should return HTTP status 200", () => {
        expect(response).to.have.status(200);

        return chakram.wait();
    });

    it("Should return a HTML page", () => {
        expect(response).to.have.header("content-type", /text\/html/);

        return chakram.wait();
    });
});
