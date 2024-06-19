import { ethers } from 'ethers';
import { config } from '../config';
import PublicPassABI from '../contracts/PublicPass.json';
import PrivatePassABI from '../contracts/PrivatePass.json';

export const connectToPublicPassContract = (provider) => {
  return new ethers.Contract(config.PUBLIC_PASS_ADDRESS, PublicPassABI, provider);
};

export const connectToPrivatePassContract = (provider) => {
  return new ethers.Contract(config.PRIVATE_PASS_ADDRESS, PrivatePassABI, provider);
};

export const storePublicData = async (signer, id, keys, values) => {
  const contract = connectToPublicPassContract(signer);
  try {
    const txResponse = await contract.storePublicData(id, keys, values);
    await txResponse.wait();
    console.log("Public data stored successfully!");
  } catch (error) {
    console.error("Failed to store public data:", error);
  }
};

export const storePrivateData = async (signer, id, keys, values, allowedAddresses) => {
  const contract = connectToPrivatePassContract(signer);
  try {
    const txResponse = await contract.storePrivateData(id, keys, values, allowedAddresses);
    await txResponse.wait();
    console.log("Private data stored successfully!");
  } catch (error) {
    console.error("Failed to store private data:", error);
  }
};

export const retrievePublicData = async (provider, id) => {
  const contract = connectToPublicPassContract(provider);
  try {
    const data = await contract.getPublicData(id);
    console.log("Retrieved public data:", data);
    return data;
  } catch (error) {
    console.error("Failed to retrieve public data:", error);
  }
};

export const retrievePrivateData = async (signer, id) => {
  const contract = connectToPrivatePassContract(signer);
  try {
    const data = await contract.getPrivateData(id);
    console.log("Retrieved private data:", data);
    return data;
  } catch (error) {
    console.error("Failed to retrieve private data:", error);
  }
};
