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
            it("should store data with valid inputs, authorized accessors, and generate an ID", async function () {
                const keys = ["materialType", "quantity", "sourceLocation", "extractionDate"];
                const values = ["Lithium", "2000 kg", "Australia", "2024-05-18"];
                const accessors = [user1.address, user2.address]; // user1 and user2 are allowed to access this data
                const tx = await privatePass.storePrivateData(keys, values, accessors, "");
                const receipt = await tx.wait();
                const newId = receipt.events.filter(x => x.event === "PrivateDataStored")[0].args.id;

                // Verify that user1 and user2 can access the data
                const dataJsonUser1 = await privatePass.connect(user1).getPrivateData(newId);
                const dataJsonUser2 = await privatePass.connect(user2).getPrivateData(newId);
                console.log(`Data JSON for user1: ${dataJsonUser1}`);
                console.log(`Data JSON for user2: ${dataJsonUser2}`);
                expect(dataJsonUser1).to.include('"materialType": "Lithium"');
                expect(dataJsonUser2).to.include('"quantity": "2000 kg"');

                // Verify that unauthorized user cannot access the data
                await expect(privatePass.connect(user3).getPrivateData(newId)).to.be.rejectedWith("Access denied");
            });

            it("should handle the first entry with an empty _previousId", async function () {
                const keys = ["materialType", "quantity"];
                const values = ["Copper", "1000 kg"];
                const accessors = [user1.address]; // user1 is allowed to access this data
                const tx = await privatePass.storePrivateData(keys, values, accessors, "");
                const receipt = await tx.wait();
                const newId = receipt.events.filter(x => x.event === "PrivateDataStored")[0].args.id;

                const dataJsonOwner = await privatePass.getPrivateData(newId);
                const dataJsonUser1 = await privatePass.connect(user1).getPrivateData(newId);
                console.log(`Data JSON for owner: ${dataJsonOwner}`);
                console.log(`Data JSON for user1: ${dataJsonUser1}`);
                expect(dataJsonOwner).to.include('"materialType": "Copper"');
                expect(dataJsonUser1).to.include('"quantity": "1000 kg"');
                await expect(privatePass.connect(user2).getPrivateData(newId)).to.be.rejectedWith("Access denied");
            });

            it("should revert with mismatched keys and values", async function () {
                const keys = ["materialType", "quantity"];
                const values = ["Lithium"];
                const accessors = [user1.address];
                await expect(privatePass.storePrivateData(keys, values, accessors, "")).to.be.rejectedWith("Keys and values length mismatch");
            });

            it("should revert if non-existent _previousId is provided", async function () {
                const keys = ["materialType", "quantity"];
                const values = ["Lithium", "1000 kg"];
                const accessors = [user1.address];
                await expect(privatePass.storePrivateData(keys, values, accessors, "nonExistentId")).to.be.rejectedWith("Previous ID does not exist");
            });
        });

        describe("updateLinks", function () {
            it("should update nextId of a previous entry correctly", async function () {
                const keys = ["materialType", "quantity"];
                const values = ["Nickel", "1000 kg"];
                const accessors = [user1.address];
                const tx1 = await privatePass.storePrivateData(keys, values, accessors, "");
                const receipt1 = await tx1.wait();
                const firstId = receipt1.events.filter(x => x.event === "PrivateDataStored")[0].args.id;
                console.log(`First ID: ${firstId}`);
            
                const tx2 = await privatePass.storePrivateData(keys, values, accessors, firstId);
                const receipt2 = await tx2.wait();
                const secondId = receipt2.events.filter(x => x.event === "PrivateDataStored")[0].args.id;
                console.log(`Second ID: ${secondId}`);
            
                const previousEntry = await privatePass.dataEntries(firstId);
                console.log(`Previous Entry Next ID: ${previousEntry.nextId}`);
                expect(previousEntry.nextId).to.equal(secondId);
            });          

            it("should not attempt to link if the previous entry does not exist", async function () {
                const keys = ["materialType", "quantity"];
                const values = ["Nickel", "1000 kg"];
                const accessors = [user1.address];
                const nonExistentId = "ID-9999";
                
                // Attempt to store data with a non-existent previous ID and expect it to fail
                const tx = privatePass.storePrivateData(keys, values, accessors, nonExistentId);
                await expect(tx).to.be.rejectedWith("Previous ID does not exist");
                tx.catch(e => console.log(`Error: ${e.message}`)); // Log the error for debugging
            });
        });

        describe("grantAccess", function () {
            it("should allow the owner to grant access", async function () {
                const keys = ["materialType", "quantity"];
                const values = ["Lithium", "1000 kg"];
                const accessors = [];
                const tx = await privatePass.storePrivateData(keys, values, accessors, "");
                const receipt = await tx.wait();
                const newId = receipt.events.filter(x => x.event === "PrivateDataStored")[0].args.id;
            
                await expect(privatePass.grantAccess(newId, user1.address)).to.not.be.rejected;
                console.log(`Granted access to user1 for ID: ${newId}`);
            });

            it("should prevent non-owners from granting access", async function () {
                const keys = ["materialType", "quantity"];
                const values = ["Lithium", "1000 kg"];
                const accessors = [];
                const tx = await privatePass.storePrivateData(keys, values, accessors, "");
                const receipt = await tx.wait();
                const newId = receipt.events.filter(x => x.event === "PrivateDataStored")[0].args.id;
            
                await expect(privatePass.connect(user1).grantAccess(newId, user2.address)).to.be.rejectedWith("Only the owner can grant access");
                console.log(`Failed to grant access by non-owner for ID: ${newId}`);
            });
        });

        describe("revokeAccess", function () {
            it("should allow the owner to revoke access", async function () {
                const keys = ["materialType", "quantity"];
                const values = ["Lithium", "1000 kg"];
                const accessors = [user1.address];
                const tx = await privatePass.storePrivateData(keys, values, accessors, "");
                const receipt = await tx.wait();
                const newId = receipt.events.filter(x => x.event === "PrivateDataStored")[0].args.id;
            
                await privatePass.grantAccess(newId, user1.address);
                await expect(privatePass.revokeAccess(newId, user1.address)).to.not.be.rejected;
                console.log(`Revoked access for user1 for ID: ${newId}`);
            });

            it("should prevent non-owners from revoking access", async function () {
                const keys = ["materialType", "quantity"];
                const values = ["Lithium", "1000 kg"];
                const accessors = [user1.address];
                const tx = await privatePass.storePrivateData(keys, values, accessors, "");
                const receipt = await tx.wait();
                const newId = receipt.events.filter(x => x.event === "PrivateDataStored")[0].args.id;
            
                await privatePass.grantAccess(newId, user1.address);
                await expect(privatePass.connect(user1).revokeAccess(newId, user2.address)).to.be.rejectedWith("Only the owner can revoke access");
                console.log(`Failed to revoke access by non-owner for ID: ${newId}`);
            });
        });

        describe("getPrivateData", function () {
            it("should allow the owner to retrieve data", async function () {
                const keys = ["materialType", "quantity"];
                const values = ["Lithium", "1000 kg"];
                const accessors = [];
                const tx = await privatePass.storePrivateData(keys, values, accessors, "");
                const receipt = await tx.wait();
                const newId = receipt.events.filter(x => x.event === "PrivateDataStored")[0].args.id;
            
                const dataJson = await privatePass.getPrivateData(newId);
                console.log(`Data JSON: ${dataJson}`);
                expect(dataJson).to.include('"materialType": "Lithium"');
                expect(dataJson).to.include('"quantity": "1000 kg"');
            });

            it("should allow granted users to retrieve data", async function () {
                const keys = ["materialType", "quantity"];
                const values = ["Lithium", "1000 kg"];
                const accessors = [user1.address];
                const tx = await privatePass.storePrivateData(keys, values, accessors, "");
                const receipt = await tx.wait();
                const newId = receipt.events.filter(x => x.event === "PrivateDataStored")[0].args.id;
            
                await privatePass.grantAccess(newId, user1.address);
                const dataJson = await privatePass.connect(user1).getPrivateData(newId);
                console.log(`Data JSON for user1: ${dataJson}`);
                expect(dataJson).to.include('"materialType": "Lithium"');
                expect(dataJson).to.include('"quantity": "1000 kg"');
            });

            it("should prevent unauthorized users from retrieving data", async function () {
                const keys = ["materialType", "quantity"];
                const values = ["Lithium", "1000 kg"];
                const accessors = [];
                const tx = await privatePass.storePrivateData(keys, values, accessors, "");
                const receipt = await tx.wait();
                const newId = receipt.events.filter(x => x.event === "PrivateDataStored")[0].args.id;
            
                await expect(privatePass.connect(user1).getPrivateData(newId)).to.be.rejectedWith("Access denied");
                console.log(`Unauthorized access attempt by user1 for ID: ${newId}`);
            });
        });
    });

    describe("Performance and Gas Usage Tests", function () {
        it("should estimate gas usage for data storage", async function () {
            const keys = ["materialType", "quantity"];
            const values = ["Lithium", "1000 kg"];
            const accessors = [user1.address];
            const gasEstimate = await privatePass.estimateGas.storePrivateData(keys, values, accessors, "");
            console.log(`Gas estimate for storePrivateData: ${gasEstimate.toString()}`);
        });

        it("should estimate gas usage for data retrieval", async function () {
            const keys = ["materialType", "quantity"];
            const values = ["Lithium", "1000 kg"];
            const accessors = [user1.address];
            const tx = await privatePass.storePrivateData(keys, values, accessors, "");
            const receipt = await tx.wait();
            const newId = receipt.events.filter(x => x.event === "PrivateDataStored")[0].args.id;
            const gasEstimate = await privatePass.estimateGas.getPrivateData(newId);
            console.log(`Gas estimate for getPrivateData: ${gasEstimate.toString()}`);
        });
    });

    describe("Edge and Corner Case Tests", function () {
        it("should handle input extremes", async function () {
            const keys = ["materialType", "quantity"];
            const values = ["Lithium", "999999999 kg"];
            const accessors = [user1.address];
            const tx = await privatePass.storePrivateData(keys, values, accessors, "");
            const receipt = await tx.wait();
            const newId = receipt.events.filter(x => x.event === "PrivateDataStored")[0].args.id;
            expect(newId).to.exist;

            const dataJson = await privatePass.getPrivateData(newId);
            console.log(`Data JSON for extreme input: ${dataJson}`);
            expect(dataJson).to.include('"quantity": "999999999 kg"');
        });

        it("should handle boundary conditions", async function () {
            const keys = Array(1000).fill("key");
            const values = Array(1000).fill("value");
            const accessors = [user1.address];
            await expect(privatePass.storePrivateData(keys, values, accessors, "")).to.be.rejectedWith("Transaction gas limit is 30717016 and exceeds block gas limit of 30000000");
        });

        it("should simulate concurrent access", async function () {
            const keys = ["materialType", "quantity"];
            const values = ["Lithium", "1000 kg"];
            const accessors = [user1.address];
            const tx1 = await privatePass.storePrivateData(keys, values, accessors, "");
            const receipt1 = await tx1.wait();
            const id1 = receipt1.events.filter(x => x.event === "PrivateDataStored")[0].args.id;

            const tx2 = await privatePass.storePrivateData(keys, values, accessors, "");
            const receipt2 = await tx2.wait();
            const id2 = receipt2.events.filter(x => x.event === "PrivateDataStored")[0].args.id;

            expect(id1).to.not.equal(id2);
        });
    });

    describe("Stress and Load Testing", function () {
        it("should handle high load", async function () {
            const keys = ["materialType", "quantity"];
            const values = ["Lithium", "1000 kg"];
            const accessors = [user1.address];
            for (let i = 0; i < 100; i++) {
                const tx = await privatePass.storePrivateData(keys, values, accessors, "");
                const receipt = await tx.wait();
                const newId = receipt.events.filter(x => x.event === "PrivateDataStored")[0].args.id;
                // console.log(`Stored data with ID: ${newId}`);
                expect(newId).to.exist;
            }
        });
    });
});
