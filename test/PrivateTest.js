const { ethers } = require("hardhat");

describe("PrivatePass Contract Tests", function () {
    let privatePass;
    let owner, user1, user2, user3;

    before(async function () {
        const chai = await import("chai");
        const chaiAsPromised = await import("chai-as-promised");
        chai.use(chaiAsPromised.default);
        global.expect = chai.expect;

        [owner, user1, user2, user3] = await ethers.getSigners();
        const PrivatePass = await ethers.getContractFactory("PrivatePass");
        privatePass = await PrivatePass.deploy();
        await privatePass.deployed();
    });

    describe("Unit Tests for Individual Functions", function () {
        describe("storePrivateData", function () {
            it("should store data with valid inputs and generate an ID", async function () {
                const keys = ["materialType", "quantity", "sourceLocation", "extractionDate"];
                const values = ["Lithium", "2000 kg", "Australia", "2024-05-18"];
                const tx = await privatePass.storePrivateData(keys, values, "");
                const receipt = await tx.wait();
                const newId = receipt.events[0].args.id;

                const dataJson = await privatePass.getPrivateData(newId);
                console.log(`Data JSON: ${dataJson}`);
                expect(dataJson).to.include('"materialType": "Lithium"');
                expect(dataJson).to.include('"quantity": "2000 kg"');
                expect(dataJson).to.include('"sourceLocation": "Australia"');
                expect(dataJson).to.include('"extractionDate": "2024-05-18"');
            });

            it("should handle the first entry with an empty _previousId", async function () {
                const keys = ["materialType", "quantity"];
                const values = ["Copper", "1000 kg"];
                const tx = await privatePass.storePrivateData(keys, values, "");
                const receipt = await tx.wait();
                const newId = receipt.events[0].args.id;

                console.log(`New ID: ${newId}`);
                expect(newId).to.exist;
            });

            it("should revert with mismatched keys and values", async function () {
                const keys = ["materialType", "quantity"];
                const values = ["Lithium"];
                await expect(privatePass.storePrivateData(keys, values, "")).to.be.rejectedWith("Keys and values length mismatch");
            });

            it("should revert if non-existent _previousId is provided", async function () {
                const keys = ["materialType", "quantity"];
                const values = ["Lithium", "1000 kg"];
                await expect(privatePass.storePrivateData(keys, values, "nonExistentId")).to.be.rejectedWith("Previous ID does not exist");
            });
        });

        describe("updateLinks", function () {
            it("should update nextId of a previous entry correctly", async function () {
                const keys = ["materialType", "quantity"];
                const values = ["Nickel", "1000 kg"];
                const tx1 = await privatePass.storePrivateData(keys, values, "");
                const receipt1 = await tx1.wait();
                const firstId = receipt1.events[0].args.id;
            
                const tx2 = await privatePass.storePrivateData(keys, values, firstId);
                const receipt2 = await tx2.wait();
                const secondId = receipt2.events[0].args.id;
            
                const previousEntry = await privatePass.dataEntries(firstId);
                console.log(`Previous Entry Next ID: ${previousEntry.nextId}`);
                expect(previousEntry.nextId).to.equal(secondId);
            });            

            it("should not attempt to link if the previous entry does not exist", async function () {
                const keys = ["materialType", "quantity"];
                const values = ["Nickel", "1000 kg"];
                const nonExistentId = "ID-9999";
                
                // Attempt to store data with a non-existent previous ID and expect it to fail
                const tx = privatePass.storePrivateData(keys, values, nonExistentId);
                await expect(tx).to.be.rejectedWith("Previous ID does not exist");
                tx.catch(e => console.log(`Error: ${e.message}`)); // Log the error for debugging
            });
            
        });

        describe("grantAccess", function () {
            it("should allow the owner to grant access", async function () {
                const keys = ["materialType", "quantity"];
                const values = ["Lithium", "1000 kg"];
                const tx = await privatePass.storePrivateData(keys, values, "");
                const receipt = await tx.wait();
                const newId = receipt.events[0].args.id;
            
                await expect(privatePass.grantAccess(newId, user1.address)).to.not.be.rejected;
            });

            it("should prevent non-owners from granting access", async function () {
                const keys = ["materialType", "quantity"];
                const values = ["Lithium", "1000 kg"];
                const tx = await privatePass.storePrivateData(keys, values, "");
                const receipt = await tx.wait();
                const newId = receipt.events[0].args.id;
            
                await expect(privatePass.connect(user1).grantAccess(newId, user2.address)).to.be.rejectedWith("Only the owner can grant access");
            });
        });

        describe("revokeAccess", function () {
            it("should allow the owner to revoke access", async function () {
                const keys = ["materialType", "quantity"];
                const values = ["Lithium", "1000 kg"];
                const tx = await privatePass.storePrivateData(keys, values, "");
                const receipt = await tx.wait();
                const newId = receipt.events[0].args.id;
            
                await privatePass.grantAccess(newId, user1.address);
                await expect(privatePass.revokeAccess(newId, user1.address)).to.not.be.rejected;
            });

            it("should prevent non-owners from revoking access", async function () {
                const keys = ["materialType", "quantity"];
                const values = ["Lithium", "1000 kg"];
                const tx = await privatePass.storePrivateData(keys, values, "");
                const receipt = await tx.wait();
                const newId = receipt.events[0].args.id;
            
                await privatePass.grantAccess(newId, user1.address);
                await expect(privatePass.connect(user1).revokeAccess(newId, user2.address)).to.be.rejectedWith("Only the owner can revoke access");
            });
        });

        describe("getPrivateData", function () {
            it("should allow the owner to retrieve data", async function () {
                const keys = ["materialType", "quantity"];
                const values = ["Lithium", "1000 kg"];
                const tx = await privatePass.storePrivateData(keys, values, "");
                const receipt = await tx.wait();
                const newId = receipt.events[0].args.id;
            
                const dataJson = await privatePass.getPrivateData(newId);
                console.log(`Data JSON: ${dataJson}`);
                expect(dataJson).to.include('"materialType": "Lithium"');
                expect(dataJson).to.include('"quantity": "1000 kg"');
            });

            it("should allow granted users to retrieve data", async function () {
                const keys = ["materialType", "quantity"];
                const values = ["Lithium", "1000 kg"];
                const tx = await privatePass.storePrivateData(keys, values, "");
                const receipt = await tx.wait();
                const newId = receipt.events[0].args.id;
            
                await privatePass.grantAccess(newId, user1.address);
                const dataJson = await privatePass.connect(user1).getPrivateData(newId);
                console.log(`Data JSON: ${dataJson}`);
                expect(dataJson).to.include('"materialType": "Lithium"');
                expect(dataJson).to.include('"quantity": "1000 kg"');
            });

            it("should prevent unauthorized users from retrieving data", async function () {
                const keys = ["materialType", "quantity"];
                const values = ["Lithium", "1000 kg"];
                const tx = await privatePass.storePrivateData(keys, values, "");
                const receipt = await tx.wait();
                const newId = receipt.events[0].args.id;
            
                await expect(privatePass.connect(user1).getPrivateData(newId)).to.be.rejectedWith("Access denied");
            });
        });
    });

    describe("Integration Tests", function () {
        it("should simulate a complete lifecycle with access control", async function () {
            // Simulate mining stage
            const miningKeys = ["materialType", "quantity", "sourceLocation", "extractionDate"];
            const miningValues = ["Lithium", "2000 kg", "Australia", "2024-05-18"];
            const miningTx = await privatePass.storePrivateData(miningKeys, miningValues, "");
            const miningReceipt = await miningTx.wait();
            const miningId = miningReceipt.events[0].args.id;
            const miningData = await privatePass.getPrivateData(miningId);
            console.log(`Mining Data: ${miningData}`);
            expect(miningData).to.include('"materialType": "Lithium"');
            expect(miningData).to.include('"quantity": "2000 kg"');

            // Grant access to manufacturer
            await privatePass.grantAccess(miningId, user1.address);

            // Simulate manufacturing stage
            const manufacturingKeys = ["productType", "quantity", "manufacturer", "productionDate"];
            const manufacturingValues = ["Battery", "1000 units", "Factory1", "2024-06-01"];
            const manufacturingTx = await privatePass.connect(user1).storePrivateData(manufacturingKeys, manufacturingValues, miningId);
            const manufacturingReceipt = await manufacturingTx.wait();
            const manufacturingId = manufacturingReceipt.events[0].args.id;
            const manufacturingData = await privatePass.getPrivateData(manufacturingId);
            console.log(`Manufacturing Data: ${manufacturingData}`);
            expect(manufacturingData).to.include('"productType": "Battery"');
            expect(manufacturingData).to.include('"quantity": "1000 units"');

            // Simulate assembly stage
            const assemblyKeys = ["assemblyType", "quantity", "assembler", "assemblyDate"];
            const assemblyValues = ["Pack", "1000 units", "AssemblyLine1", "2024-07-01"];
            const assemblyTx = await privatePass.storePrivateData(assemblyKeys, assemblyValues, manufacturingId);
            const assemblyReceipt = await assemblyTx.wait();
            const assemblyId = assemblyReceipt.events[0].args.id;
            const assemblyData = await privatePass.getPrivateData(assemblyId);
            console.log(`Assembly Data: ${assemblyData}`);
            expect(assemblyData).to.include('"assemblyType": "Pack"');
            expect(assemblyData).to.include('"quantity": "1000 units"');
        });
    });

    describe("Performance and Gas Usage Tests", function () {
        it("should estimate gas usage for data storage", async function () {
            const keys = ["materialType", "quantity"];
            const values = ["Lithium", "1000 kg"];
            const gasEstimate = await privatePass.estimateGas.storePrivateData(keys, values, "");
            console.log(`Gas estimate for storePrivateData: ${gasEstimate.toString()}`);
        });

        it("should estimate gas usage for data retrieval", async function () {
            const keys = ["materialType", "quantity"];
            const values = ["Lithium", "1000 kg"];
            const tx = await privatePass.storePrivateData(keys, values, "");
            const receipt = await tx.wait();
            const newId = receipt.events[0].args.id;
            const gasEstimate = await privatePass.estimateGas.getPrivateData(newId);
            console.log(`Gas estimate for getPrivateData: ${gasEstimate.toString()}`);
        });
    });

    describe("Edge and Corner Case Tests", function () {
        it("should handle input extremes", async function () {
            const keys = ["materialType", "quantity"];
            const values = ["Lithium", "999999999 kg"];
            const tx = await privatePass.storePrivateData(keys, values, "");
            const receipt = await tx.wait();
            const newId = receipt.events[0].args.id;
            expect(newId).to.exist;

            const dataJson = await privatePass.getPrivateData(newId);
            console.log(`Data JSON for extreme input: ${dataJson}`);
            expect(dataJson).to.include('"quantity": "999999999 kg"');
        });

        it("should handle boundary conditions", async function () {
            const keys = Array(1000).fill("key");
            const values = Array(1000).fill("value");
            await expect(privatePass.storePrivateData(keys, values, "")).to.be.rejectedWith("Transaction gas limit is 30715160 and exceeds block gas limit of 30000000");
        });

        it("should simulate concurrent access", async function () {
            const keys = ["materialType", "quantity"];
            const values = ["Lithium", "1000 kg"];
            const tx1 = await privatePass.storePrivateData(keys, values, "");
            const receipt1 = await tx1.wait();
            const id1 = receipt1.events[0].args.id;

            const tx2 = await privatePass.storePrivateData(keys, values, "");
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
                const tx = await privatePass.storePrivateData(keys, values, "");
                const receipt = await tx.wait();
                const newId = receipt.events[0].args.id;
                expect(newId).to.exist;
            }
        });
    });
});
