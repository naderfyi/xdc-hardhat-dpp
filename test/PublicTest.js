const { ethers } = require("hardhat");

describe("PublicPass Contract", function () {
    let PublicPass;
    let publicPass;
    let owner;
    let addr1;
    let addr2;

    before(async function () {
        const chai = await import("chai");
        const chaiAsPromised = await import("chai-as-promised");
        chai.use(chaiAsPromised.default);
        global.expect = chai.expect;

        [owner, addr1, addr2, _] = await ethers.getSigners();
        PublicPass = await ethers.getContractFactory("PublicPass");
        publicPass = await PublicPass.deploy();
        await publicPass.deployed();
    });

    it("Should store public data and generate a unique ID", async function () {
        const keys = ["materialType", "quantity", "sourceLocation", "extractionDate"];
        const values = ["Lithium", "2000 kg", "Australia", "2024-05-18"];
        const tx = await publicPass.connect(addr1).storePublicData(keys, values, "");
        const receipt = await tx.wait();
        
        const event = receipt.events.find(event => event.event === 'PublicDataStored');
        const newId = event.args.id;
        
        expect(newId).to.not.be.empty;
        const dataJson = await publicPass.getPublicData(newId);
        expect(dataJson).to.equal('{"materialType": "Lithium", "quantity": "2000 kg", "sourceLocation": "Australia", "extractionDate": "2024-05-18"}');
    });

    it("Should link entries with previousId and nextId", async function () {
        const keys1 = ["materialType", "quantity"];
        const values1 = ["Lithium", "1000 kg"];
        const tx1 = await publicPass.connect(addr1).storePublicData(keys1, values1, "");
        const receipt1 = await tx1.wait();
        const event1 = receipt1.events.find(event => event.event === 'PublicDataStored');
        const id1 = event1.args.id;

        const keys2 = ["cellSpecifications", "usedLithium"];
        const values2 = ["Type A, 100Wh", "800 kg"];
        const tx2 = await publicPass.connect(addr1).storePublicData(keys2, values2, id1);
        const receipt2 = await tx2.wait();
        const event2 = receipt2.events.find(event => event.event === 'PublicDataStored');
        const id2 = event2.args.id;

        expect(id2).to.not.be.empty;

        const entry1 = await publicPass.dataEntries(id1);
        expect(entry1.nextId).to.equal(id2);

        const entry2 = await publicPass.dataEntries(id2);
        expect(entry2.previousId).to.equal(id1);
    });

    it("should allow storing and retrieving public data freely", async function () {
        const keys = ["phase", "step"];
        const values = ["Mining", "Raw Material Extraction"];
        const tx = await publicPass.connect(addr2).storePublicData(keys, values, "");
        const receipt = await tx.wait();
        
        const event = receipt.events.find(event => event.event === 'PublicDataStored');
        const newId = event.args.id;

        expect(newId).to.not.be.empty;
        const dataJson = await publicPass.getPublicData(newId);
        expect(dataJson).to.equal('{"phase": "Mining", "step": "Raw Material Extraction"}');
    });

    it("should ensure data is accessible and structured as JSON-like format", async function () {
        const keys = ["materialType", "quantity"];
        const values = ["Lithium", "1000 kg"];
        const tx = await publicPass.connect(addr1).storePublicData(keys, values, "");
        const receipt = await tx.wait();
        const event = receipt.events.find(event => event.event === 'PublicDataStored');
        const id = event.args.id;

        const dataJson = await publicPass.getPublicData(id);
        expect(dataJson).to.be.a("string");
        expect(dataJson).to.include("{");
        expect(dataJson).to.include("}");
        expect(dataJson).to.include("materialType");
        expect(dataJson).to.include("quantity");
    });

    it("should revert when keys and values length mismatch", async function () {
        const keys = ["key1", "key2"];
        const values = ["value1"];
        await expect(publicPass.connect(addr1).storePublicData(keys, values, ""))
            .to.be.rejectedWith("Keys and values length mismatch");
    });

    it("should revert when retrieving data from non-existent ID", async function () {
        await expect(publicPass.getPublicData("nonexistent-id"))
            .to.be.rejectedWith("ID not found");
    });

    it("shouldn't allow storing data with an empty key", async function () {
        const keys = [""];
        const values = ["value1"];
        await expect(publicPass.connect(addr1).storePublicData(keys, values, ""))
            .to.be.rejectedWith("Key cannot be empty");
    });

    it("should retrieve data by ID and ensure JSON-like structure", async function () {
        const keys = ["materialType", "quantity"];
        const values = ["Lithium", "1000 kg"];
        const tx = await publicPass.connect(addr1).storePublicData(keys, values, "");
        const receipt = await tx.wait();
        const event = receipt.events.find(event => event.event === 'PublicDataStored');
        const id = event.args.id;

        const dataJson = await publicPass.getPublicData(id);
        expect(dataJson).to.be.a("string");
        expect(dataJson).to.include("{");
        expect(dataJson).to.include("}");
        expect(dataJson).to.include("materialType");
        expect(dataJson).to.include("quantity");
    });

    it("should allow storing shipment data and generate a unique ID", async function () {
        const keys = ["recipient", "materialType", "quantity"];
        const values = ["manufacturer-001", "Lithium", "1000 kg"];
        const tx = await publicPass.connect(addr1).storePublicData(keys, values, "");
        const receipt = await tx.wait();
        
        const event = receipt.events.find(event => event.event === 'PublicDataStored');
        const newId = event.args.id;

        expect(newId).to.not.be.empty;
        const dataJson = await publicPass.getPublicData(newId);
        expect(dataJson).to.equal('{"recipient": "manufacturer-001", "materialType": "Lithium", "quantity": "1000 kg"}');
    });

    it("should allow different users to store shipment data and generate unique IDs", async function () {
        const keys1 = ["recipient", "materialType", "quantity"];
        const values1 = ["manufacturer-001", "Lithium", "1000 kg"];
        const tx1 = await publicPass.connect(addr1).storePublicData(keys1, values1, "");
        const receipt1 = await tx1.wait();
        const event1 = receipt1.events.find(event => event.event === 'PublicDataStored');
        const id1 = event1.args.id;

        const keys2 = ["recipient", "materialType", "quantity"];
        const values2 = ["manufacturer-002", "Lithium", "500 kg"];
        const tx2 = await publicPass.connect(addr2).storePublicData(keys2, values2, "");
        const receipt2 = await tx2.wait();
        const event2 = receipt2.events.find(event => event.event === 'PublicDataStored');
        const id2 = event2.args.id;

        expect(id1).to.not.be.empty;
        expect(id2).to.not.be.empty;
        expect(id1).to.not.equal(id2);

        const dataJson1 = await publicPass.getPublicData(id1);
        const dataJson2 = await publicPass.getPublicData(id2);

        expect(dataJson1).to.equal('{"recipient": "manufacturer-001", "materialType": "Lithium", "quantity": "1000 kg"}');
        expect(dataJson2).to.equal('{"recipient": "manufacturer-002", "materialType": "Lithium", "quantity": "500 kg"}');
    });
});

describe("Supply Chain Lifecycle", function () {
    let PublicPass;
    let publicPass;
    let owner;
    let miner;
    let manufacturer1;
    let manufacturer2;
    let research;
    let assembler1;
    let assembler2;
    let distributor;
    let recycler;

    before(async function () {
        const chai = await import("chai");
        const chaiAsPromised = await import("chai-as-promised");
        chai.use(chaiAsPromised.default);
        global.expect = chai.expect;

        [owner, miner, manufacturer1, manufacturer2, research, assembler1, assembler2, distributor, recycler] = await ethers.getSigners();
        PublicPass = await ethers.getContractFactory("PublicPass");
        publicPass = await PublicPass.deploy();
        await publicPass.deployed();
    });

    it("Should store mining data and generate a unique ID", async function () {
        const keys = ["materialType", "quantity", "sourceLocation", "extractionDate"];
        const values = ["Lithium", "2000 kg", "Australia", "2024-05-18"];
        const tx = await publicPass.connect(miner).storePublicData(keys, values, "");
        const receipt = await tx.wait();
        
        const event = receipt.events.find(event => event.event === 'PublicDataStored');
        const mineId = event.args.id;
        
        expect(mineId).to.not.be.empty;
        const dataJson = await publicPass.getPublicData(mineId);
        expect(dataJson).to.equal('{"materialType": "Lithium", "quantity": "2000 kg", "sourceLocation": "Australia", "extractionDate": "2024-05-18"}');
    });

    it("Should create and link shipment data for manufacturer and research", async function () {
        const keys = ["materialType", "quantity", "sourceLocation", "extractionDate"];
        const values = ["Lithium", "2000 kg", "Australia", "2024-05-18"];
        let tx = await publicPass.connect(miner).storePublicData(keys, values, "");
        let receipt = await tx.wait();
        let event = receipt.events.find(event => event.event === 'PublicDataStored');
        const mineId = event.args.id;

        const shipmentKeys = ["recipient", "materialType", "quantity"];
        let shipmentValues = ["manufacturer-001", "Lithium", "1000 kg"];
        tx = await publicPass.connect(miner).storePublicData(shipmentKeys, shipmentValues, mineId);
        receipt = await tx.wait();
        event = receipt.events.find(event => event.event === 'PublicDataStored');
        const shipmentId1 = event.args.id;

        shipmentValues = ["manufacturer-002", "Lithium", "500 kg"];
        tx = await publicPass.connect(miner).storePublicData(shipmentKeys, shipmentValues, mineId);
        receipt = await tx.wait();
        event = receipt.events.find(event => event.event === 'PublicDataStored');
        const shipmentId2 = event.args.id;

        shipmentValues = ["research-001", "Lithium", "500 kg"];
        tx = await publicPass.connect(miner).storePublicData(shipmentKeys, shipmentValues, mineId);
        receipt = await tx.wait();
        event = receipt.events.find(event => event.event === 'PublicDataStored');
        const shipmentId3 = event.args.id;

        expect(shipmentId1).to.not.be.empty;
        expect(shipmentId2).to.not.be.empty;
        expect(shipmentId3).to.not.be.empty;
    });

    it("Should store manufacturing data linked to shipment and generate a unique ID", async function () {
        const keys = ["cellSpecifications", "usedLithium", "productionDate", "batchNumbers", "totalCellsProduced"];
        const values = ["Type A, 100Wh", "800 kg", "2024-06-01", "Batch001", "100"];
        const previousId = "shipment-001";
        const tx = await publicPass.connect(manufacturer1).storePublicData(keys, values, previousId);
        const receipt = await tx.wait();
        
        const event = receipt.events.find(event => event.event === 'PublicDataStored');
        const manufacturingId = event.args.id;
        
        expect(manufacturingId).to.not.be.empty;
        const dataJson = await publicPass.getPublicData(manufacturingId);
        expect(dataJson).to.equal('{"cellSpecifications": "Type A, 100Wh", "usedLithium": "800 kg", "productionDate": "2024-06-01", "batchNumbers": "Batch001", "totalCellsProduced": "100"}');
    });

    it("Should store and link assembly data", async function () {
        const keys = ["assemblyDetails", "technician", "assemblyDate"];
        const values = ["Assembly Type C", "John Doe", "2024-06-15"];
        const previousId = "ship-004";
        const tx = await publicPass.connect(assembler1).storePublicData(keys, values, previousId);
        const receipt = await tx.wait();
        
        const event = receipt.events.find(event => event.event === 'PublicDataStored');
        const assemblyId = event.args.id;
        
        expect(assemblyId).to.not.be.empty;
        const dataJson = await publicPass.getPublicData(assemblyId);
        expect(dataJson).to.equal('{"assemblyDetails": "Assembly Type C", "technician": "John Doe", "assemblyDate": "2024-06-15"}');
    });

    it("Should store and link distribution data", async function () {
        const keys = ["distributionNetwork", "unitsShipped"];
        const values = ["Global", "100"];
        const previousIds = ["ship-004", "ship-005"];
        const tx = await publicPass.connect(distributor).storePublicData(keys, values, previousIds.join(","));
        const receipt = await tx.wait();
        
        const event = receipt.events.find(event => event.event === 'PublicDataStored');
        const distributionId = event.args.id;
        
        expect(distributionId).to.not.be.empty;
        const dataJson = await publicPass.getPublicData(distributionId);
        expect(dataJson).to.equal('{"distributionNetwork": "Global", "unitsShipped": "100"}');
    });

    it("Should store and link recycling data", async function () {
        const keys = ["recyclingType", "recyclingDetails", "complianceData"];
        const values = ["Chemical extraction", "Extracted 80% usable Lithium", "Complies with EPA standards"];
        const previousId = "distribution-001";
        const tx = await publicPass.connect(recycler).storePublicData(keys, values, previousId);
        const receipt = await tx.wait();
        
        const event = receipt.events.find(event => event.event === 'PublicDataStored');
        const recyclingId = event.args.id;
        
        expect(recyclingId).to.not.be.empty;
        const dataJson = await publicPass.getPublicData(recyclingId);
        expect(dataJson).to.equal('{"recyclingType": "Chemical extraction", "recyclingDetails": "Extracted 80% usable Lithium", "complianceData": "Complies with EPA standards"}');
    });

});
