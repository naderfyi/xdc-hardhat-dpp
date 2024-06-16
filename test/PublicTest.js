const { ethers } = require("hardhat");

describe("PublicPass Contract", function () {
    let expect;
    let PublicPass, publicPass;
    let owner, addr1, addr2;

    before(async function () {
        const chai = await import("chai");
        const chaiAsPromised = await import("chai-as-promised");
        chai.use(chaiAsPromised.default);
        expect = chai.expect;

        [owner, addr1, addr2] = await ethers.getSigners();

        PublicPass = await ethers.getContractFactory("PublicPass");
        publicPass = await PublicPass.deploy();
        await publicPass.deployed();
    });

    it("should allow storing and retrieving public data freely", async function () {
        const id = "battery-12345";
        const keys = ["materialType", "quantity"];
        const values = ["Lithium", "2000 kg"];

        // Store public data
        await publicPass.connect(owner).storePublicData(id, keys, values);

        // Retrieve public data by any user
        const retrievedData = await publicPass.connect(addr1).getPublicData(id);
        console.log(retrievedData); // Output the structured data for verification
        expect(retrievedData).to.include("Lithium");
        expect(retrievedData).to.include("2000 kg");
    });

    it("should append data correctly under the same ID by multiple users", async function () {
        const id = "battery-12345";
        const keysOwner = ["cellSpecifications"];
        const valuesOwner = ["Type A, 100Wh"];
        const keysAddr1 = ["shippingMethod"];
        const valuesAddr1 = ["Air freight"];

        // Owner adds more data
        await publicPass.connect(owner).storePublicData(id, keysOwner, valuesOwner);

        // addr1 adds their data
        await publicPass.connect(addr1).storePublicData(id, keysAddr1, valuesAddr1);

        // Retrieve and verify all data under the same ID
        const retrievedData = await publicPass.getPublicData(id);
        console.log(retrievedData); // Output the structured data for verification
        expect(retrievedData).to.include("Type A, 100Wh");
        expect(retrievedData).to.include("Air freight");
    });

    it("should ensure data is accessible and structured as JSON-like format", async function () {
        const id = "new-battery-123";
        const keys = ["owner", "storageCapacity"];
        const values = ["0x12345", "5000mAh"];

        // Store data with JSON-like structure
        await publicPass.connect(addr2).storePublicData(id, keys, values);

        // Retrieve data
        const data = await publicPass.getPublicData(id);
        console.log(data); // Output to verify JSON-like structure
        expect(data).to.include("0x12345");
        expect(data).to.include("5000mAh");
    });
});
