const { ethers } = require("hardhat");

describe("PrivatePass and PublicPass Contracts", function () {
  let expect;
  let PrivatePass, privatePass, PublicPass, publicPass;
  let owner, addr1, addr2;

  before(async function () {
    // Dynamically import Chai and chai-as-promised
    const chai = await import("chai");
    const chaiAsPromised = await import("chai-as-promised");
    chai.use(chaiAsPromised.default);
    expect = chai.expect;

    [owner, addr1, addr2] = await ethers.getSigners();

    // Deploy PrivatePass contract
    PrivatePass = await ethers.getContractFactory("PrivatePass");
    privatePass = await PrivatePass.deploy();
    await privatePass.deployed();

    // Deploy PublicPass contract
    PublicPass = await ethers.getContractFactory("PublicPass");
    publicPass = await PublicPass.deploy();
    await publicPass.deployed();
  });

  describe("PrivatePass Contract", function () {
    it("should store and retrieve private data", async function () {
      const keyPrivate = "co2emissions";
      const valuePrivate = "200";
      const allowedAddresses = [addr1.address];

      await privatePass.connect(owner).storePrivateData(keyPrivate, valuePrivate, allowedAddresses);
      
      const [keys, values] = await privatePass.connect(owner).getPrivateData(owner.address);
      expect(keys).to.include(keyPrivate);
      expect(values).to.include(valuePrivate);
    });

    it("should only allow authorized addresses to retrieve data", async function () {
      const keyPrivate = "co2emissions";
      const valuePrivate = "300";
      const allowedAddresses = [addr1.address];

      await privatePass.connect(owner).storePrivateData(keyPrivate, valuePrivate, allowedAddresses);

      await expect(privatePass.connect(addr2).getPrivateData(owner.address)).to.be.rejectedWith("Not allowed to view data");
      
      const [keys, values] = await privatePass.connect(addr1).getPrivateData(owner.address);
      expect(keys).to.include(keyPrivate);
      expect(values).to.include(valuePrivate);
    });
  });

  describe("PublicPass Contract", function () {
    it("should store and retrieve public data", async function () {
      const keyPublic = "materialtype";
      const valuePublic = "Lithium";

      await publicPass.connect(owner).storePublicData(keyPublic, valuePublic);
      
      const [keys, values] = await publicPass.connect(owner).getPublicData(owner.address);
      expect(keys).to.include(keyPublic);
      expect(values).to.include(valuePublic);
    });
  });
});
