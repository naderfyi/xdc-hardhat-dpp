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

    it("should handle multiple types of data for a single user correctly", async function () {
        const id = "multi-type-123";
        const keys = ["dataType1", "dataType2"];
        const values = ["value1", "2"];
        const allowedAddresses = [addr1.address];

        // User 1 stores multiple data types
        await privatePass.connect(owner).storePrivateData(id, keys, values, allowedAddresses);

        // Retrieve public data by any authorized user
        const retrievedData = await privatePass.connect(addr1).getPrivateData(id);
        expect(retrievedData).to.include("value1");
        expect(retrievedData).to.include("2");
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

    it("should allow granting access to a new address after data has been stored", async function () {
        const id = "access-test";
        const keys = ["dataKey"];
        const values = ["dataValue"];
        const initialAllowedAddresses = [addr1.address];
    
        // Owner stores private data
        await privatePass.connect(owner).storePrivateData(id, keys, values, initialAllowedAddresses);
    
        // Grant access to a new address
        const newAllowedAddress = addr2.address;
        await privatePass.connect(owner).grantAccess(id, newAllowedAddress);
    
        // New address should now have access
        const dataByNewAddress = await privatePass.connect(addr2).getPrivateData(id);
        expect(dataByNewAddress).to.include("dataValue");
    });

    it("should allow revoking access from an address", async function () {
        const id = "revoke-test";
        const keys = ["dataKey"];
        const values = ["dataValue"];
        const allowedAddresses = [addr1.address, addr2.address];
    
        // Owner stores private data
        await privatePass.connect(owner).storePrivateData(id, keys, values, allowedAddresses);
    
        // Revoke access from addr2
        await privatePass.connect(owner).revokeAccess(id, addr2.address);
    
        // addr2 should no longer have access
        await expect(privatePass.connect(addr2).getPrivateData(id)).to.be.rejectedWith("Access denied or ID not found");
    });

    it("should handle storing and retrieving data with empty keys and values", async function () {
        const id = "empty-key-value-test";
        const keys = [""];
        const values = [""];
    
        // Owner stores private data with empty key and value
        await privatePass.connect(owner).storePrivateData(id, keys, values, [addr1.address]);
    
        // Retrieve data
        const retrievedData = await privatePass.connect(addr1).getPrivateData(id);
        expect(retrievedData).to.include("\"\": \"\"");
    });
    
    describe("should handle numeric and non-numeric data aggregation correctly", function () {
        let id, keyNumeric, keyNonNumeric, allowedAddresses;
    
        before(async function () {
            id = "aggregation-test";
            keyNumeric = "temperature";
            keyNonNumeric = "status";
            allowedAddresses = [owner.address, addr1.address, addr2.address];
        });
    
        it("should correctly aggregate numeric private data and only return aggregated data when there are sufficient contributions", async function () {
            // Storing numeric data
            await privatePass.connect(owner).storePrivateData(id, [keyNumeric], ["100"], allowedAddresses);
            await privatePass.connect(addr1).storePrivateData(id, [keyNumeric], ["200"], allowedAddresses);
            await privatePass.connect(addr2).storePrivateData(id, [keyNumeric], ["50"], allowedAddresses);
    
            // Retrieving and verifying aggregated data
            const aggregatedData = await privatePass.getAggregateData(id);
            expect(aggregatedData).to.include(`"${keyNumeric}": 350`);
        });
    
        it("should not return aggregated data if there are less than three contributions of numeric data", async function () {
            const idLess = "less-contributions";
            // Storing numeric data but only from two users
            await privatePass.connect(owner).storePrivateData(idLess, [keyNumeric], ["100"], allowedAddresses);
            await privatePass.connect(addr1).storePrivateData(idLess, [keyNumeric], ["200"], allowedAddresses);
    
            // Attempt to retrieve aggregated data
            const aggregatedData = await privatePass.getAggregateData(idLess);
            expect(aggregatedData).to.equal("{}");
        });
    
        it("should not aggregate non-numeric data", async function () {
            // Storing non-numeric data
            await privatePass.connect(owner).storePrivateData(id, [keyNonNumeric], ["okay"], allowedAddresses);
            await privatePass.connect(addr1).storePrivateData(id, [keyNonNumeric], ["good"], allowedAddresses);
            await privatePass.connect(addr2).storePrivateData(id, [keyNonNumeric], ["excellent"], allowedAddresses);
    
            // Retrieving aggregated data should not include non-numeric keys
            const aggregatedData = await privatePass.getAggregateData(id);
            expect(aggregatedData).not.to.include(keyNonNumeric);
        });
    });    
    
    it("should correctly aggregate private data across multiple users and only return aggregated data when there are sufficient contributions", async function () {
        const id = "data-aggregate";
        const key = "co2";
        const values = ["100", "200", "300", "50"];
        const allowedAddresses = [owner.address, addr1.address, addr2.address, addr3.address];
    
        // Different users store data under the same ID and same key
        await privatePass.connect(owner).storePrivateData(id, [key], [values[0]], allowedAddresses);
        await privatePass.connect(addr1).storePrivateData(id, [key], [values[1]], allowedAddresses);
        await privatePass.connect(addr2).storePrivateData(id, [key], [values[2]], allowedAddresses);
        await privatePass.connect(addr3).storePrivateData(id, [key], [values[3]], allowedAddresses);
    
        // Attempt to retrieve aggregated data
        const aggregatedData = await privatePass.getAggregateData(id);
        // Check if the aggregated data includes the sum of the "co2" from four contributions which is 650
        expect(aggregatedData).to.include(`"co2": 650`);
    
        // Now check a scenario where less than three users contribute
        const idLess = "data-less";
        await privatePass.connect(owner).storePrivateData(idLess, [key], [values[0]], allowedAddresses);
        await privatePass.connect(addr1).storePrivateData(idLess, [key], [values[1]], allowedAddresses);
    
        // Retrieving aggregated data where contributions are less than required
        const aggregatedDataLess = await privatePass.getAggregateData(idLess);
        expect(aggregatedDataLess).to.equal("{}"); // Expect an empty JSON object since only two contributions
    });
    
    describe("Aggregate JSON Structure Validation", function () {
        let id, keys, values, allowedAddresses;
    
        before(async function () {
            id = "json-structure-test";
            keys = ["co2", "humidity", "status"];
            values = ["400", "50", "active"];
            allowedAddresses = [owner.address, addr1.address, addr2.address, addr3.address];
        });
    
        it("should verify correct JSON structure in aggregate data with varied contributions", async function () {
            // Ensuring three numeric contributions to "co2" to meet aggregation criteria
            await privatePass.connect(owner).storePrivateData(id, [keys[0]], [values[0]], allowedAddresses);
            await privatePass.connect(addr1).storePrivateData(id, [keys[0]], ["600"], allowedAddresses); // Second CO2 contribution
            await privatePass.connect(addr2).storePrivateData(id, [keys[0]], ["300"], allowedAddresses); // Third CO2 contribution
    
            // Additional contributions to "humidity"
            await privatePass.connect(addr1).storePrivateData(id, [keys[1]], [values[1]], allowedAddresses);
            await privatePass.connect(addr2).storePrivateData(id, [keys[1]], ["60"], allowedAddresses); // Second Humidity contribution
            await privatePass.connect(addr3).storePrivateData(id, [keys[1]], ["40"], allowedAddresses); // Third Humidity contribution
    
            // Non-numeric contribution which should not be aggregated
            await privatePass.connect(addr3).storePrivateData(id, [keys[2]], [values[2]], allowedAddresses);
    
            // Attempt to retrieve aggregated data
            const aggregatedData = await privatePass.getAggregateData(id);
            console.log("Aggregated Data:", aggregatedData);

            // Checking JSON structure for correct aggregation of numeric data and exclusion of non-numeric data
            expect(aggregatedData).to.include(`"${keys[0]}": 1300`); // Sum of CO2 contributions
            expect(aggregatedData).to.include(`"${keys[1]}": 150`);   // Sum of Humidity contributions
            expect(aggregatedData).not.to.include(keys[2]);          // 'status' is non-numeric and should not be aggregated
        });
    });    
});
