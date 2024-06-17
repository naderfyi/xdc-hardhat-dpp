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

    it("should revert when keys and values length mismatch", async function () {
        const id = "battery-12345";
        const keys = ["materialType"];
        const values = ["Lithium", "2000 kg"];
    
        await expect(publicPass.connect(owner).storePublicData(id, keys, values))
            .to.be.rejectedWith("Keys and values length mismatch");
    });

    it("should allow multiple users to store data under the same ID without conflict", async function () {
        const id = "shared-id";
        const keys1 = ["dataKey1"];
        const values1 = ["value1"];
        const keys2 = ["dataKey2"];
        const values2 = ["value2"];
    
        await publicPass.connect(owner).storePublicData(id, keys1, values1);
        await publicPass.connect(addr1).storePublicData(id, keys2, values2);
    
        const data = await publicPass.getPublicData(id);
        console.log(data);
        expect(data).to.include("value1");
        expect(data).to.include("value2");
    });

    it("should overwrite existing keys for the same user", async function () {
        const id = "overwrite-test";
        const keys = ["key1"];
        const initialValues = ["initialValue"];
        const newValues = ["newValue"];
    
        await publicPass.connect(owner).storePublicData(id, keys, initialValues);
    
        // Overwrite the existing key
        await publicPass.connect(owner).storePublicData(id, keys, newValues);
    
        const data = await publicPass.getPublicData(id);
        console.log(data);
        expect(data).to.include("newValue");
        expect(data).to.not.include("initialValue");
    });

    it("should revert when retrieving data from non-existent ID", async function () {
        const nonExistentID = "non-existent-id";
    
        await expect(publicPass.getPublicData(nonExistentID))
            .to.be.rejectedWith("ID not found");
    });

    it("should handle storing data with an empty key", async function () {
        const id = "empty-key-test";
        const keys = [""];
        const values = ["emptyKeyValue"];
    
        await publicPass.connect(owner).storePublicData(id, keys, values);
    
        const data = await publicPass.getPublicData(id);
        console.log(data);
        expect(data).to.include("emptyKeyValue");
    });

    it("should allow the same user to create multiple entries under different IDs", async function () {
        const id1 = "user-entry-1";
        const id2 = "user-entry-2";
        const keys1 = ["key1"];
        const values1 = ["value1"];
        const keys2 = ["key2"];
        const values2 = ["value2"];
    
        await publicPass.connect(owner).storePublicData(id1, keys1, values1);
        await publicPass.connect(owner).storePublicData(id2, keys2, values2);
    
        const data1 = await publicPass.getPublicData(id1);
        const data2 = await publicPass.getPublicData(id2);
        console.log(data1);
        console.log(data2);
        expect(data1).to.include("value1");
        expect(data2).to.include("value2");
    });

    it("should retrieve data by ID for a single user", async function () {
        const id = "single-user-id";
        const keys = ["key1", "key2"];
        const values = ["value1", "value2"];
    
        await publicPass.connect(owner).storePublicData(id, keys, values);
    
        const data = await publicPass.getPublicData(id);
        console.log(data);
        expect(data).to.include("value1");
        expect(data).to.include("value2");
        expect(data.toLowerCase()).to.include(owner.address.toLowerCase());
    });
    
    it("should retrieve data by ID for multiple users", async function () {
        const id = "multi-user-id";
        const keys1 = ["key1"];
        const values1 = ["value1"];
        const keys2 = ["key2"];
        const values2 = ["value2"];
    
        await publicPass.connect(owner).storePublicData(id, keys1, values1);
        await publicPass.connect(addr1).storePublicData(id, keys2, values2);
    
        const data = await publicPass.getPublicData(id);
        console.log(data);
        expect(data).to.include("value1");
        expect(data).to.include("value2");
        expect(data.toLowerCase()).to.include(owner.address.toLowerCase());
        expect(data.toLowerCase()).to.include(addr1.address.toLowerCase());
    });

    it("should retrieve data by ID and ensure JSON-like structure", async function () {
        const id = "json-structure-id";
        const keys = ["key1", "key2"];
        const values = ["value1", "value2"];
    
        await publicPass.connect(owner).storePublicData(id, keys, values);
    
        const data = await publicPass.getPublicData(id);
        console.log(data);
        expect(data.startsWith("[")).to.be.true;
        expect(data.endsWith("]")).to.be.true;
        expect(data).to.include("{\"owner\":");
        expect(data).to.include("\"publicData\":");
        expect(data).to.include("\"key1\": \"value1\"");
        expect(data).to.include("\"key2\": \"value2\"");
    });

    it("should revert when retrieving data for a non-existent ID", async function () {
        const nonExistentID = "non-existent-id";
    
        await expect(publicPass.getPublicData(nonExistentID))
            .to.be.rejectedWith("ID not found");
    });

    it("should retrieve the most recent values when data is overwritten", async function () {
        const id = "overwrite-retrieve-id";
        const keys = ["key1"];
        const initialValues = ["initialValue"];
        const newValues = ["newValue"];
    
        await publicPass.connect(owner).storePublicData(id, keys, initialValues);
        await publicPass.connect(owner).storePublicData(id, keys, newValues);
    
        const data = await publicPass.getPublicData(id);
        console.log(data);
        expect(data).to.include("newValue");
        expect(data).to.not.include("initialValue");
    });

    it("should retrieve data stored with an empty key", async function () {
        const id = "empty-key-retrieve";
        const keys = [""];
        const values = ["emptyKeyValue"];
    
        await publicPass.connect(owner).storePublicData(id, keys, values);
    
        const data = await publicPass.getPublicData(id);
        console.log(data);
        expect(data).to.include("emptyKeyValue");
        expect(data).to.include("\"\": \"emptyKeyValue\"");
    });
    
});
