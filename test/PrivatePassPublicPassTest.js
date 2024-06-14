const { ethers } = require("hardhat");

describe("PrivatePass and PublicPass Contracts", function () {
  let expect;
  let PrivatePass, privatePass, PublicPass, publicPass;
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

    PublicPass = await ethers.getContractFactory("PublicPass");
    publicPass = await PublicPass.deploy();
    await publicPass.deployed();
  });

  describe("PrivatePass Contract", function () {
    it("should allow storing and retrieving private data with correct access controls", async function () {
      const key = "sensitiveInfo";
      const value = "123";
      const allowedAddresses = [addr1.address];

      // Store data with access control
      await privatePass.connect(owner).storePrivateData(key, value, allowedAddresses);

      // Retrieve data by authorized user
      const dataByAuthorized = await privatePass.connect(addr1).getPrivateData(owner.address, key);
      expect(dataByAuthorized).to.equal(value);

      // Unauthorized access attempt
      await expect(privatePass.connect(addr2).getPrivateData(owner.address, key))
          .to.be.rejectedWith("Access denied or key not found");
  });

  it("should deny access to private data for unauthorized users", async function () {
    const key = "privateInfo";
    const value = "456";  // Changed to numeric value
    const allowedAddresses = [addr1.address];

    await privatePass.connect(owner).storePrivateData(key, value, allowedAddresses);

    // Access attempt by unauthorized user
    await expect(privatePass.connect(addr2).getPrivateData(owner.address, key))
        .to.be.rejectedWith("Access denied or key not found");
  });
});

  describe("Aggregation of Private Data", function () {
    it("should correctly aggregate private data values with common keys from multiple users", async function () {
        const key = "co2emission";
        const value1 = "200";  // User 1's emission
        const value2 = "300";  // User 2's emission

        // User 1 stores data
        await privatePass.connect(addr1).storePrivateData(key, value1, [addr1.address, addr2.address]);
        // User 2 stores data
        await privatePass.connect(addr2).storePrivateData(key, value2, [addr2.address, addr3.address]);

        // Retrieve aggregated data and convert BigNumber to string for comparison
        const aggregatedData = await privatePass.getAggregateData(key);
        expect(aggregatedData.toString()).to.equal("500");  // Compare as strings

        // Unauthorized access checks
        await expect(privatePass.connect(addr3).getPrivateData(addr1.address, key))
            .to.be.rejectedWith("Access denied or key not found");
        await expect(privatePass.connect(addr1).getPrivateData(addr2.address, key))
            .to.be.rejectedWith("Access denied or key not found");
    });
  });

  describe("PublicPass Contract", function () {
    it("should allow storing and retrieving public data freely", async function () {
      const key = "publicInfo";
      const value = "openData";

      await publicPass.connect(owner).storePublicData(key, value);

      // Public data retrieval by any user
      const retrievedData = await publicPass.connect(addr1).getPublicData(owner.address, key);
      expect(retrievedData).to.equal(value);
    });

    it("should ensure public data is accessible by anyone", async function () {
      const key = "generalInfo";
      const value = "accessibleToAll";

      await publicPass.connect(owner).storePublicData(key, value);

      // Check access by multiple users
      const dataByUser1 = await publicPass.connect(addr1).getPublicData(owner.address, key);
      expect(dataByUser1).to.equal(value);

      const dataByUser2 = await publicPass.connect(addr2).getPublicData(owner.address, key);
      expect(dataByUser2).to.equal(value);
    });
  });
});
