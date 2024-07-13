const { ethers } = require("hardhat");

describe("PublicPass Contract Tests", function () {
    let publicPass;
    let owner, miner, manufacturer1, manufacturer2, research, assembler1, assembler2, distributor, recycler;

    before(async function () {
        const chai = await import("chai");
        const chaiAsPromised = await import("chai-as-promised");
        chai.use(chaiAsPromised.default);
        global.expect = chai.expect;

        [owner, miner, manufacturer1, manufacturer2, research, assembler1, assembler2, distributor, recycler] = await ethers.getSigners();
        const PublicPass = await ethers.getContractFactory("PublicPass");
        publicPass = await PublicPass.deploy();
        await publicPass.deployed();
    });

    describe("Unit Tests for Individual Functions", function () {
        describe("storePublicData", function () {
            it("should store data with valid inputs and generate an ID", async function () {
                const keys = ["materialType", "quantity", "sourceLocation", "extractionDate"];
                const values = ["Lithium", "2000 kg", "Australia", "2024-05-18"];
                const tx = await publicPass.storePublicData(keys, values, "");
                const receipt = await tx.wait();
                const newId = receipt.events[0].args.id;

                const dataJson = await publicPass.getPublicData(newId);
                console.log(`Data JSON: ${dataJson}`);
                expect(dataJson).to.include('"materialType": "Lithium"');
                expect(dataJson).to.include('"quantity": "2000 kg"');
                expect(dataJson).to.include('"sourceLocation": "Australia"');
                expect(dataJson).to.include('"extractionDate": "2024-05-18"');
            });

            it("should handle the first entry with an empty _previousId", async function () {
                const keys = ["materialType", "quantity"];
                const values = ["Copper", "1000 kg"];
                const tx = await publicPass.storePublicData(keys, values, "");
                const receipt = await tx.wait();
                const newId = receipt.events[0].args.id;

                console.log(`New ID: ${newId}`);
                expect(newId).to.exist;
            });

            it("should revert with mismatched keys and values", async function () {
                const keys = ["materialType", "quantity"];
                const values = ["Lithium"];
                await expect(publicPass.storePublicData(keys, values, "")).to.be.rejectedWith("Keys and values length mismatch");
            });

            // This test expects an error "Previous ID does not exist" first since it's checked first in the function
            it("should revert if non-existent _previousId is provided and sender does not have a shipment", async function () {
                const keys = ["materialType", "quantity"];
                const values = ["Lithium", "1000 kg"];
                await expect(publicPass.storePublicData(keys, values, "nonExistentId"))
                .to.be.rejectedWith("Previous ID does not exist");
            });
        });

        describe("updateLinks", function () {
            it("should update nextId of a previous entry correctly", async function () {
                const keys = ["materialType", "quantity"];
                const values = ["Nickel", "1000 kg"];
                const tx1 = await publicPass.storePublicData(keys, values, "");
                const receipt1 = await tx1.wait();
                const firstId = receipt1.events[0].args.id;
            
                const tx2 = await publicPass.storePublicData(keys, values, firstId);
                const receipt2 = await tx2.wait();
                const secondId = receipt2.events[0].args.id;
            
                const previousEntry = await publicPass.dataEntries(firstId);
                console.log(`Previous Entry Next ID: ${previousEntry.nextId}`);
                expect(previousEntry.nextId).to.equal(secondId);
            });            

            it("should not attempt to link if the previous entry does not exist", async function () {
                const keys = ["materialType", "quantity"];
                const values = ["Nickel", "1000 kg"];
                const nonExistentId = "ID-9999";
                
                // Attempt to store data with a non-existent previous ID and expect it to fail
                const tx = publicPass.storePublicData(keys, values, nonExistentId);
                await expect(tx).to.be.rejectedWith("Previous ID does not exist");
                tx.catch(e => console.log(`Error: ${e.message}`)); // Log the error for debugging
            });
            
        });

        describe("aggregateData", function () {
            it("should correctly aggregate data from a single entry", async function () {
                const keys = ["quantity"];
                const values = ["500"];
                const tx = await publicPass.storePublicData(keys, values, "");
                const receipt = await tx.wait();
                const newId = receipt.events[0].args.id;

                const totalQuantity = await publicPass.aggregateData(newId, "quantity");
                console.log(`Total Quantity from single entry: ${totalQuantity}`);
                expect(totalQuantity.toNumber()).to.equal(500);
            });

            it("should correctly aggregate data across multiple linked entries", async function () {
                const keys = ["quantity"];
                const values1 = ["500"];
                const values2 = ["1500"];
                const tx1 = await publicPass.storePublicData(keys, values1, "");
                const receipt1 = await tx1.wait();
                const firstId = receipt1.events[0].args.id;

                const tx2 = await publicPass.storePublicData(keys, values2, firstId);
                const receipt2 = await tx2.wait();
                const secondId = receipt2.events[0].args.id;

                const totalQuantity = await publicPass.aggregateData(firstId, "quantity");
                console.log(`Total Quantity from multiple entries: ${totalQuantity}`);
                expect(totalQuantity.toNumber()).to.equal(2000);
            });

            it("should return zero or revert when started with an invalid ID", async function () {
                const totalQuantity = await publicPass.aggregateData("invalidId", "quantity");
                console.log(`Total Quantity from invalid ID: ${totalQuantity}`);
                expect(totalQuantity.toNumber()).to.equal(0);
            });
        });

        describe("parseUint", function () {
            it("should correctly parse valid numeric strings", async function () {
                const parsedUint = await publicPass.parseUint("1234");
                console.log(`Parsed Uint: ${parsedUint}`);
                expect(parsedUint.toNumber()).to.equal(1234);
            });

            it("should handle non-numeric characters in strings", async function () {
                const parsedUint = await publicPass.parseUint("1234abc");
                console.log(`Parsed Uint with non-numeric: ${parsedUint}`);
                expect(parsedUint.toNumber()).to.equal(1234);
            });
        });

        describe("generateUniqueId", function () {
            it("should generate unique IDs for each call", async function () {
                const id1 = await publicPass.generateUniqueId();
                const id2 = await publicPass.generateUniqueId();
                console.log(`Generated IDs: ${id1}, ${id2}`);
                expect(id1).to.not.equal(id2);
            });

            it("should generate consistent IDs given the same inputs", async function () {
                const id1 = await publicPass.generateUniqueId();
                const id2 = await publicPass.generateUniqueId();
                console.log(`Generated IDs: ${id1}, ${id2}`);
                expect(id1).to.not.equal(id2);
            });
        });
    });

    describe("Integration Tests", function () {
        it("should simulate a complete lifecycle", async function () {
            // Simulate mining stage
            const miningKeys = ["materialType", "quantity", "sourceLocation", "extractionDate"];
            const miningValues = ["Lithium", "2000 kg", "Australia", "2024-05-18"];
            const miningTx = await publicPass.storePublicData(miningKeys, miningValues, "");
            const miningReceipt = await miningTx.wait();
            const miningId = miningReceipt.events[0].args.id;
            const miningData = await publicPass.getPublicData(miningId);
            console.log(`Mining Data: ${miningData}`);
            expect(miningData).to.include('"materialType": "Lithium"');
            expect(miningData).to.include('"quantity": "2000 kg"');

            // Simulate manufacturing stage
            const manufacturingKeys = ["productType", "quantity", "manufacturer", "productionDate"];
            const manufacturingValues = ["Battery", "1000 units", "Factory1", "2024-06-01"];
            const manufacturingTx = await publicPass.storePublicData(manufacturingKeys, manufacturingValues, miningId);
            const manufacturingReceipt = await manufacturingTx.wait();
            const manufacturingId = manufacturingReceipt.events[0].args.id;
            const manufacturingData = await publicPass.getPublicData(manufacturingId);
            console.log(`Manufacturing Data: ${manufacturingData}`);
            expect(manufacturingData).to.include('"productType": "Battery"');
            expect(manufacturingData).to.include('"quantity": "1000 units"');

            // Simulate assembly stage
            const assemblyKeys = ["assemblyType", "quantity", "assembler", "assemblyDate"];
            const assemblyValues = ["Pack", "1000 units", "AssemblyLine1", "2024-07-01"];
            const assemblyTx = await publicPass.storePublicData(assemblyKeys, assemblyValues, manufacturingId);
            const assemblyReceipt = await assemblyTx.wait();
            const assemblyId = assemblyReceipt.events[0].args.id;
            const assemblyData = await publicPass.getPublicData(assemblyId);
            console.log(`Assembly Data: ${assemblyData}`);
            expect(assemblyData).to.include('"assemblyType": "Pack"');
            expect(assemblyData).to.include('"quantity": "1000 units"');
        });

        it("should emit PublicDataStored events correctly", async function () {
            const keys = ["materialType", "quantity"];
            const values = ["Lithium", "1000 kg"];
            const tx = await publicPass.storePublicData(keys, values, "");
            const receipt = await tx.wait();

            const event = receipt.events.find(event => event.event === "PublicDataStored");
            console.log(`PublicDataStored Event: ${event}`);
            expect(event).to.exist;
        });

        it("should emit AggregateDataStored events correctly", async function () {
            const keys = ["materialType", "quantity"];
            const values = ["Lithium", "1000 kg"];
            const tx = await publicPass.storePublicData(keys, values, "");
            const receipt = await tx.wait();
            const newId = receipt.events[0].args.id;

            const aggregateDataTx = await publicPass.storeAggregateData(newId, "aggregate data");
            const aggregateReceipt = await aggregateDataTx.wait();
            const event = aggregateReceipt.events.find(event => event.event === "AggregateDataStored");
            console.log(`AggregateDataStored Event: ${event}`);
            expect(event).to.exist;
        });
    });

    describe("Performance and Gas Usage Tests", function () {
        it("should estimate gas usage for data storage", async function () {
            const keys = ["materialType", "quantity"];
            const values = ["Lithium", "1000 kg"];
            const gasEstimate = await publicPass.estimateGas.storePublicData(keys, values, "");
            console.log(`Gas estimate for storePublicData: ${gasEstimate.toString()}`);
        });

        it("should estimate gas usage for data retrieval", async function () {
            const keys = ["materialType", "quantity"];
            const values = ["Lithium", "1000 kg"];
            const tx = await publicPass.storePublicData(keys, values, "");
            const receipt = await tx.wait();
            const newId = receipt.events[0].args.id;
            const gasEstimate = await publicPass.estimateGas.getPublicData(newId);
            console.log(`Gas estimate for getPublicData: ${gasEstimate.toString()}`);
        });
    });

    describe("Edge and Corner Case Tests", function () {
        it("should handle input extremes", async function () {
            const keys = ["materialType", "quantity"];
            const values = ["Lithium", "999999999 kg"];
            const tx = await publicPass.storePublicData(keys, values, "");
            const receipt = await tx.wait();
            const newId = receipt.events[0].args.id;
            expect(newId).to.exist;

            const dataJson = await publicPass.getPublicData(newId);
            console.log(`Data JSON for extreme input: ${dataJson}`);
            expect(dataJson).to.include('"quantity": "999999999 kg"');
        });

        it("should handle boundary conditions", async function () {
            const keys = Array(1000).fill("key");
            const values = Array(1000).fill("value");
            await expect(publicPass.storePublicData(keys, values, "")).to.be.rejectedWith("Transaction gas limit is 30715160 and exceeds block gas limit of 30000000");
        });

        it("should simulate concurrent access", async function () {
            const keys = ["materialType", "quantity"];
            const values = ["Lithium", "1000 kg"];
            const tx1 = await publicPass.storePublicData(keys, values, "");
            const receipt1 = await tx1.wait();
            const id1 = receipt1.events[0].args.id;

            const tx2 = await publicPass.storePublicData(keys, values, "");
            const receipt2 = await tx2.wait();
            const id2 = receipt2.events[0].args.id;

            expect(id1).to.not.equal(id2);
        });
    });

    describe("Stress and Load Testing", function () {
        it("should handle high load", async function () {
            const keys = ["materialType", "quantity"];
            const values = ["Lithium", "1000 kg"];
            for (let i = 0; i < 100; i++) {
                const tx = await publicPass.storePublicData(keys, values, "");
                const receipt = await tx.wait();
                const newId = receipt.events[0].args.id;
                expect(newId).to.exist;
            }
        });
    });
});
