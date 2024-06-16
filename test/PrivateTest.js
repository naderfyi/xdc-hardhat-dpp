const { ethers } = require("hardhat");

describe("PrivatePass Contract", function () {
    let expect;
    let PrivatePass, privatePass;
    let owner, addr1, addr2, addr3;

    before(async function () {
        const chai = await import("chai");
        const chaiAsPromised = await import("chai-as-promised");
        chai.use(chaiAsPromised.default);
        expect = chai.expect;

        [owner, addr1, addr2, addr3] = await ethers.getSigners();

        PrivatePass = await ethers.getContractFactory("PrivatePass");
        privatePass = await PrivatePass.deploy();
        await privatePass.deployed();
    });

    it("should allow storing and retrieving private data with correct access control", async function () {
        const id = "confidential-12345";
        const keys = ["sensitiveInfo", "securityLevel"];
        const values = ["classified", "high"];
        const allowedAddresses = [addr1.address, addr2.address];

        // Owner stores private data
        await privatePass.connect(owner).storePrivateData(id, keys, values, allowedAddresses);

        // Allowed user retrieves data
        const dataByAllowedUser = await privatePass.connect(addr1).getPrivateData(id);
        expect(dataByAllowedUser).to.include("classified");
        expect(dataByAllowedUser).to.include("high");

        // Unauthorized access attempt
        await expect(privatePass.connect(addr3).getPrivateData(id)).to.be.rejectedWith("Access denied or ID not found");
    });

    it("should correctly aggregate private data and only return aggregated data when there are sufficient contributions", async function () {
        const id1 = "data-1";
        const id2 = "data-2";
        const id3 = "data-3";
        const key = "energyUsage";
        const values = ["100", "200", "300"];
        const allowedAddresses = [addr1.address, addr2.address, addr3.address];

        // Different users store data under the same key
        await privatePass.connect(owner).storePrivateData(id1, [key], [values[0]], allowedAddresses);
        await privatePass.connect(addr1).storePrivateData(id2, [key], [values[1]], allowedAddresses);
        await privatePass.connect(addr2).storePrivateData(id3, [key], [values[2]], allowedAddresses);

        // Retrieve and verify aggregated data
        const aggregatedData1 = await privatePass.getAggregateData(id1, key);
        const aggregatedData2 = await privatePass.getAggregateData(id2, key);
        const aggregatedData3 = await privatePass.getAggregateData(id3, key);

        // Since each ID only has one entry, the aggregation should return "{}" because count < 3
        expect(aggregatedData1).to.equal("{}");
        expect(aggregatedData2).to.equal("{}");
        expect(aggregatedData3).to.equal("{}");

        // Add more entries to ensure count >= 3 for one ID
        await privatePass.connect(owner).storePrivateData(id1, [key], ["150"], allowedAddresses);
        await privatePass.connect(owner).storePrivateData(id1, [key], ["200"], allowedAddresses);

        const updatedAggregatedData1 = await privatePass.getAggregateData(id1, key);
        expect(updatedAggregatedData1).to.include("\"energyUsage\": 450");
    });

    it("should not return aggregated data if there are less than three contributions", async function () {
        const id = "partial-1";
        const key = "partialData";
        const values = ["50", "150"];
        const allowedAddresses = [addr1.address, addr2.address];

        // Insufficient data points for aggregation
        await privatePass.connect(owner).storePrivateData(id, [key], [values[0]], allowedAddresses);
        await privatePass.connect(addr1).storePrivateData(id, [key], [values[1]], allowedAddresses);

        // Attempt to retrieve aggregated data
        const aggregatedData = await privatePass.getAggregateData(id, key);
        expect(aggregatedData).to.equal("{}"); // Should be empty JSON object
    });

    it("should handle multiple types of data for a single user correctly", async function () {
        const id = "multi-type-123";
        const keys = ["dataType1", "dataType2"];
        const values = ["value1", 2];
        const allowedAddresses = [addr1.address];

        // User 1 stores multiple data types
        await privatePass.connect(owner).storePrivateData(id, keys, values, allowedAddresses);

        // Retrieve public data by any authorized user
        const retrievedData = await privatePass.connect(addr1).getPrivateData(id);
        expect(retrievedData).to.include("value1");
        expect(retrievedData).to.include(2);
    });

    it("should append data correctly under the same ID by multiple users with proper access control", async function () {
        const id = "shared-12345";
        const keysOwner = ["firstOwnerData"];
        const valuesOwner = ["OwnerData"];
        const keysAddr1 = ["secondOwnerData"];
        const valuesAddr1 = ["Addr1Data"];
        const allowedAddresses = [owner.address, addr1.address, addr2.address]; // Explicitly include the owner
    
        // Owner adds initial data
        await privatePass.connect(owner).storePrivateData(id, keysOwner, valuesOwner, allowedAddresses);
    
        // Retrieve data after owner's addition
        const dataAfterOwnerAddition = await privatePass.connect(owner).getPrivateData(id);
        console.log("Data after owner addition:", dataAfterOwnerAddition);
    
        // addr1 adds more data
        await privatePass.connect(addr1).storePrivateData(id, keysAddr1, valuesAddr1, allowedAddresses);
    
        // Retrieve data after addr1's addition
        const dataAfterAddr1Addition = await privatePass.connect(owner).getPrivateData(id);
        console.log("Data after addr1 addition:", dataAfterAddr1Addition);
    
        // Check data accessibility and structure
        const retrievedDataOwner = await privatePass.connect(owner).getPrivateData(id);
        const retrievedDataAddr1 = await privatePass.connect(addr1).getPrivateData(id);
    
        console.log("Data retrieved by owner:", retrievedDataOwner); // To observe the JSON output
        console.log("Data retrieved by addr1:", retrievedDataAddr1); // To observe the JSON output
    
        expect(retrievedDataOwner).to.include("\"firstOwnerData\": \"OwnerData\"");
        expect(retrievedDataOwner).to.include("\"secondOwnerData\": \"Addr1Data\"");
    
        expect(retrievedDataAddr1).to.include("OwnerData");
        expect(retrievedDataAddr1).to.include("Addr1Data");
    
        // Unauthorized access attempt
        await expect(privatePass.connect(addr3).getPrivateData(id)).to.be.rejectedWith("Access denied or ID not found");
    });
      

    it("should ensure data is accessible and structured as JSON-like format for all authorized users", async function () {
        const id = "format-test-123";
        const keys = ["key1", "key2"];
        const values = ["value1", "value2"];
        const allowedAddresses = [addr1.address, addr2.address];

        // Store data
        await privatePass.connect(owner).storePrivateData(id, keys, values, allowedAddresses);

        // Retrieve and validate JSON format
        const dataByOwner = await privatePass.connect(owner).getPrivateData(id);
        const dataByAddr1 = await privatePass.connect(addr1).getPrivateData(id);

        console.log(dataByOwner); // To verify JSON structure
        expect(dataByOwner).to.include("{\"owner\":");
        expect(dataByOwner).to.include("\"key1\": \"value1\"");
        expect(dataByOwner).to.include("\"key2\": \"value2\"");

        expect(dataByAddr1).to.include("{\"owner\":");
        expect(dataByAddr1).to.include("\"key1\": \"value1\"");
        expect(dataByAddr1).to.include("\"key2\": \"value2\"");

        // Ensure addr2 also has access
        const dataByAddr2 = await privatePass.connect(addr2).getPrivateData(id);
        expect(dataByAddr2).to.include("value1");
        expect(dataByAddr2).to.include("value2");

        // Check for unauthorized access by addr3
        await expect(privatePass.connect(addr3).getPrivateData(id)).to.be.rejectedWith("Access denied or ID not found");
    });

    it("should deny access to unauthorized users and handle non-existent data", async function () {
        const id = "non-existent";
        
        // Attempt to access data that does not exist
        await expect(privatePass.connect(addr1).getPrivateData(id)).to.be.rejectedWith("Access denied or ID not found");

        // Setup data for another test
        const keys = ["dataKey"];
        const values = ["dataValue"];
        const allowedAddresses = [addr1.address]; // Only addr1 is authorized

        // Store data
        await privatePass.connect(owner).storePrivateData("existent", keys, values, allowedAddresses);

        // Unauthorized user tries to access
        await expect(privatePass.connect(addr2).getPrivateData("existent")).to.be.rejectedWith("Access denied or ID not found");
    });
});
