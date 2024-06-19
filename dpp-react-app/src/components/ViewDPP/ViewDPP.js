// src/components/ViewDPP/ViewDPP.js
import React, { useState } from 'react';
import { ethers } from 'ethers';
import PrivatePass from '../../contracts/PrivatePass.json';
import PublicPass from '../../contracts/PublicPass.json';
import { config } from '../../config';
import { switchNetwork } from '../../utils/switchNetwork';
import './ViewDPP.css';

const ViewDPP = ({ signer }) => {
  const [id, setId] = useState('');
  const [privateData, setPrivateData] = useState('');
  const [publicData, setPublicData] = useState('');
  const [error, setError] = useState('');

  async function validateNetwork(expectedChainId) {
    const currentNetwork = await signer.provider.getNetwork();
    const currentChainIdInt = parseInt(currentNetwork.chainId);
    const expectedChainIdInt = parseInt(expectedChainId);
  
    console.log(`Current network ID: ${currentChainIdInt}, Expected network ID: ${expectedChainIdInt}`);
    if (currentChainIdInt !== expectedChainIdInt) {
      throw new Error(`Network mismatch: expected ${expectedChainIdInt}, but got ${currentChainIdInt}`);
    }
  }

  async function switchAndRefreshNetwork(targetNetwork) {
    await switchNetwork(targetNetwork);
    await refreshSigner(); // Ensure the signer is updated
  }
  
  // Helper function to refresh the signer
  async function refreshSigner() {
    const provider = new ethers.providers.Web3Provider(window.ethereum);
    signer = provider.getSigner();
  }  

  const fetchDataFromContract = async (contract, method, dataSetter) => {
    try {
      const data = await contract[method](id);
      dataSetter(data);
    } catch (err) {
      console.error(`Error fetching data:`, err);
      dataSetter('Data not found or ID not found.');
    }
  };

  
  const handleFetchData = async () => {
    try {
      // Attempt to fetch private data
      await switchAndRefreshNetwork('private');
      await validateNetwork(config.SUBNET_CHAIN_ID);
      const privatePassContract = new ethers.Contract(config.PRIVATE_PASS_ADDRESS, PrivatePass.abi, signer);
      await fetchDataFromContract(privatePassContract, 'getPrivateData', setPrivateData);

      // Switch to public network and fetch public data
      await switchAndRefreshNetwork('public');
      await validateNetwork(config.APOTHEM_CHAIN_ID);
      const publicPassContract = new ethers.Contract(config.PUBLIC_PASS_ADDRESS, PublicPass.abi, signer);
      await fetchDataFromContract(publicPassContract, 'getPublicData', setPublicData);

    } catch (error) {
      console.error('Network or fetching error:', error);
      setError(error.message);
    }
  };

  return (
    <div>
      <h2>View Digital Product Passport</h2>
      <input type="text" value={id} onChange={e => setId(e.target.value)} placeholder="DPP ID" />
      <button onClick={handleFetchData}>Fetch Data</button>
      <h3>Private Data</h3>
      <div>{privateData}</div>
      <h3>Public Data</h3>
      <div>{publicData}</div>
      {error && <p>{error}</p>}
    </div>
  );
};

export default ViewDPP;
