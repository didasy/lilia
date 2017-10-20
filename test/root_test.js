const configuration = require("../configuration");

const chakram = require("chakram");
const expect = chakram.expect;

describe("/ GET", () => {
    let response = chakram.get("http://localhost:9000/");

    it("Should return HTTP status 200", () => {
        expect(response).to.have.status(200);

        return chakram.wait();
    });

    it("Should bear application/json header", () => {
        expect(response).to.have.header("content-type", /application\/json/);

        return chakram.wait();
    });

    it("Should return expected values", () => {
        expect(response).to.comprise.of.json({
            service: "Lilia",
            version: configuration.app.version
        });

        return chakram.wait();
    });
});
