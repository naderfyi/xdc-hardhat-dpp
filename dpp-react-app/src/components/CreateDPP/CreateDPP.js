import React, { useState } from 'react';
import { ethers } from 'ethers';
import PrivatePass from '../../contracts/PrivatePass.json';
import PublicPass from '../../contracts/PublicPass.json';
import { config } from '../../config';
import { switchNetwork } from '../../utils/switchNetwork'; // Adjust the path as necessary

const CreateDPP = ({ signer }) => {
  const [id, setId] = useState('');
  const [entries, setEntries] = useState([
    { key: '', value: '', type: 'public', allowedAddresses: [] }
  ]);
  const [txStatus, setTxStatus] = useState('');
  const [txHash, setTxHash] = useState('');

  const handleAddEntry = () => {
    setEntries([...entries, { key: '', value: '', type: 'public', allowedAddresses: [] }]);
    console.log('Added new data entry field');
  };

  const handleRemoveEntry = (index) => {
    const newEntries = entries.filter((_, idx) => idx !== index);
    setEntries(newEntries);
    console.log(`Removed entry at index ${index}`);
  };

  const handleAddAddress = (index) => {
    const newEntries = entries.map((entry, idx) => {
      if (idx === index) {
        return {
          ...entry,
          allowedAddresses: [...entry.allowedAddresses, '']
        };
      }
      return entry;
    });
    setEntries(newEntries);
    console.log(`Added new address field to entry ${index}`);
  };

  const handleRemoveAddress = (entryIndex, addressIndex) => {
    const newEntries = entries.map((entry, idx) => {
      if (idx === entryIndex) {
        const newAddresses = entry.allowedAddresses.filter((_, addrIdx) => addrIdx !== addressIndex);
        return { ...entry, allowedAddresses: newAddresses };
      }
      return entry;
    });
    setEntries(newEntries);
    console.log(`Removed address at index ${addressIndex} from entry ${entryIndex}`);
  };

  const handleEntryChange = (index, field, value) => {
    const newEntries = entries.map((entry, i) => {
      if (i === index) {
        return { ...entry, [field]: value };
      }
      return entry;
    });
    setEntries(newEntries);
  };

  const handleAddressChange = (entryIndex, addressIndex, value) => {
    const newEntries = entries.map((entry, idx) => {
      if (idx === entryIndex) {
        const newAddresses = [...entry.allowedAddresses];
        newAddresses[addressIndex] = value;
        return { ...entry, allowedAddresses: newAddresses };
      }
      return entry;
    });
    setEntries(newEntries);
    console.log(`Updated address at ${entryIndex}, ${addressIndex}: ${value}`);
  };

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
  
  const handleCreateDPP = async () => {
    console.log('Preparing to store data...');
    const privateEntries = entries.filter(entry => entry.type === 'private');
    const publicEntries = entries.filter(entry => entry.type === 'public');
  
    try {
      if (privateEntries.length > 0) {
        await switchAndRefreshNetwork('private');
        await validateNetwork(config.SUBNET_CHAIN_ID);
        // Perform private transactions
        await handlePrivateTransactions(privateEntries);
      }
  
      if (publicEntries.length > 0) {
        await switchAndRefreshNetwork('public');
        await validateNetwork(config.APOTHEM_CHAIN_ID);
        // Perform public transactions
        await handlePublicTransactions(publicEntries);
      }
    } catch (error) {
      console.error('Transaction failed:', error);
      setTxStatus(`Transaction failed: ${error.message}`);
    }
  };
  
  async function handlePrivateTransactions(entries) {
    const keys = entries.map(entry => entry.key);
    const values = entries.map(entry => entry.value);
    const addresses = entries.map(entry => entry.allowedAddresses.filter(addr => addr.trim() !== ''));
    const contract = new ethers.Contract(config.PRIVATE_PASS_ADDRESS, PrivatePass.abi, signer);
    const txResponse = await contract.storePrivateData(id, keys, values, addresses.flat());
    await txResponse.wait();
    setTxStatus('Private data stored successfully!');
    setTxHash(txResponse.hash);
    console.log('Private transaction hash:', txResponse.hash);
  }
  
  async function handlePublicTransactions(entries) {
    const keys = entries.map(entry => entry.key);
    const values = entries.map(entry => entry.value);
    const contract = new ethers.Contract(config.PUBLIC_PASS_ADDRESS, PublicPass.abi, signer);
    const txResponse = await contract.storePublicData(id, keys, values);
    await txResponse.wait();
    setTxStatus('Public data stored successfully!');
    setTxHash(txResponse.hash);
    console.log('Public transaction hash:', txResponse.hash);
  }
  
  return (
    <div>
      <h2>Create Digital Product Passport</h2>
      <input type="text" value={id} onChange={e => setId(e.target.value)} placeholder="DPP ID" />
      {entries.map((entry, index) => (
        <div key={index}>
          <input type="text" value={entry.key} onChange={e => handleEntryChange(index, 'key', e.target.value)} placeholder="Key" />
          <input type="text" value={entry.value} onChange={e => handleEntryChange(index, 'value', e.target.value)} placeholder="Value" />
          <select value={entry.type} onChange={e => handleEntryChange(index, 'type', e.target.value)}>
            <option value="public">Public</option>
            <option value="private">Private</option>
          </select>
          <button onClick={() => handleRemoveEntry(index)}>X</button>
          {entry.type === 'private' && entry.allowedAddresses.map((address, addrIdx) => (
            <div key={addrIdx}>
              <input
                type="text"
                value={address}
                onChange={e => handleAddressChange(index, addrIdx, e.target.value)}
                placeholder="Allowed Address"
              />
              <button onClick={() => handleRemoveAddress(index, addrIdx)}>X</button>
            </div>
          ))}
          {entry.type === 'private' && (
            <button onClick={() => handleAddAddress(index)}>Add Address</button>
          )}
        </div>
      ))}
      <button onClick={handleAddEntry}>Add Entry</button>
      <button onClick={handleCreateDPP}>Create DPP</button>
      <p>{txStatus}</p>
      {txHash && (
        <p>Transaction Hash: <a href={`https://explorer.apothem.network/tx/${txHash}`} target="_blank" rel="noopener noreferrer">{txHash}</a></p>
      )}
    </div>
  );
};

export default CreateDPP;
