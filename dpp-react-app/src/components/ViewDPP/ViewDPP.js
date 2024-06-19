import React, { useState } from 'react';
import { ethers } from 'ethers';
import PrivatePass from '../../contracts/PrivatePass.json';
import PublicPass from '../../contracts/PublicPass.json';
import { config } from '../../config';

const ViewDPP = ({ provider }) => {
  const [id, setId] = useState('');
  const [privateData, setPrivateData] = useState('');
  const [publicData, setPublicData] = useState('');
  const [error, setError] = useState('');

  const fetchData = async () => {
    const signer = provider.getSigner();
    const privatePassContract = new ethers.Contract(config.PRIVATE_PASS_ADDRESS, PrivatePass.abi, signer);
    const publicPassContract = new ethers.Contract(config.PUBLIC_PASS_ADDRESS, PublicPass.abi, provider);

    // Clear previous state
    setPrivateData('Fetching...');
    setPublicData('Fetching...');
    setError('');

    // Fetch private data
    privatePassContract.getPrivateData(id).then(data => {
      setPrivateData(data);
    }).catch(err => {
      console.error('Error fetching private data:', err);
      setPrivateData('No accessible private data or ID not found.');
    });

    // Fetch public data
    publicPassContract.getPublicData(id).then(data => {
      setPublicData(data);
    }).catch(err => {
      console.error('Error fetching public data:', err);
      setPublicData('Public data not found or ID not found.');
    });
  };

  return (
    <div>
      <h2>View Digital Product Passport</h2>
      <input type="text" value={id} onChange={e => setId(e.target.value)} placeholder="DPP ID" />
      <button onClick={fetchData}>Fetch Data</button>
      <h3>Private Data</h3>
      <div>{privateData}</div>
      <h3>Public Data</h3>
      <div>{publicData}</div>
      {error && <p>{error}</p>}
    </div>
  );
};

export default ViewDPP;
