require("@nomiclabs/hardhat-waffle");
require("dotenv").config({ path: ".env" });

const { ethers } = require("hardhat");

async function checkConnection(url, timeout = 5000) {
  try {
    const provider = new ethers.providers.JsonRpcProvider(url);
    const promise = provider.getBlockNumber();

    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Connection timed out')), timeout)
    );

    await Promise.race([promise, timeoutPromise]);
    console.log(`Successfully connected to ${url}`);
    return true;
  } catch (error) {
    console.error(`Failed to connect to ${url}:`, error);
    return false;
  }
}

async function main() {
  const subnetUrl = process.env.SUBNET_NETWORK_URL;
  const apothemUrl = process.env.APOTHEM_NETWORK_URL;

  // Check connection to the subnet
  const isSubnetConnected = await checkConnection(subnetUrl);
  if (!isSubnetConnected) {
    console.error("Cannot connect to the subnet. Deployment aborted.");
    process.exit(1);
  }

  // Deploy PrivatePass using Subnet
  const subnetProvider = new ethers.providers.JsonRpcProvider(subnetUrl);
  const subnetDeployer = new ethers.Wallet(process.env.SUBNET_PRIVATE_KEY, subnetProvider);
  const PrivatePass = await ethers.getContractFactory("PrivatePass", subnetDeployer);
  const privatePass = await PrivatePass.deploy();
  await privatePass.deployed();

  console.log("Deploying contracts with the account:", subnetDeployer.address);
  console.log("PrivatePass deployed to:", privatePass.address);
  console.log("Tx Hash:", privatePass.deployTransaction.hash);

  // Check connection to the Apothem testnet
  const isApothemConnected = await checkConnection(apothemUrl);
  if (!isApothemConnected) {
    console.error("Cannot connect to the Apothem testnet. Deployment aborted.");
    process.exit(1);
  }

  // Deploy PublicPass using Apothem
  const apothemProvider = new ethers.providers.JsonRpcProvider(apothemUrl);
  const apothemDeployer = new ethers.Wallet(process.env.APOTHEM_PRIVATE_KEY, apothemProvider);
  const PublicPass = await ethers.getContractFactory("PublicPass", apothemDeployer);
  const publicPass = await PublicPass.deploy();
  await publicPass.deployed();

  console.log("Deploying contracts with the account:", apothemDeployer.address);
  console.log("PublicPass deployed to:", publicPass.address);
  console.log("Tx Hash:", publicPass.deployTransaction.hash);
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
