import React, { useState } from 'react';
import { ethers } from 'ethers';
import { Box, Button, Input, VStack, FormControl, FormLabel, Select, Flex, Link, useToast, Text } from '@chakra-ui/react';
import PrivatePass from '../../contracts/PrivatePass.json';
import PublicPass from '../../contracts/PublicPass.json';
import { config } from '../../config';
import { switchNetwork } from '../../utils/switchNetwork';
import { IoClose } from 'react-icons/io5';

const CreateDPP = ({ signer }) => {
  const [id, setId] = useState('');
  const [entries, setEntries] = useState([
    { key: '', value: '', type: 'public', allowedAddresses: [] }
  ]);
  const [txStatus, setTxStatus] = useState('');
  const [txHashes, setTxHashes] = useState([]);
  const toast = useToast();

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
        const txHash = await handlePrivateTransactions(privateEntries);
        setTxHashes(prevHashes => [...prevHashes, { hash: txHash, type: 'private' }]);
      }
  
      if (publicEntries.length > 0) {
        await switchAndRefreshNetwork('public');
        await validateNetwork(config.APOTHEM_CHAIN_ID);
        // Perform public transactions
        const txHash = await handlePublicTransactions(publicEntries);
        setTxHashes(prevHashes => [...prevHashes, { hash: txHash, type: 'public' }]);
      }
  
      setTxStatus('Data stored successfully!');
      toast({
        title: "Success",
        description: "Data has been stored successfully!",
        status: "success",
        duration: 5000,
        isClosable: true,
      });
    } catch (error) {
      console.error('Transaction failed:', error);
      setTxStatus(`Transaction failed: ${error.message}`);
      toast({
        title: "Transaction failed",
        description: error.message,
        status: "error",
        duration: 5000,
        isClosable: true,
      });
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
    return txResponse.hash;
  }

  async function handlePublicTransactions(entries) {
    const keys = entries.map(entry => entry.key);
    const values = entries.map(entry => entry.value);
    const contract = new ethers.Contract(config.PUBLIC_PASS_ADDRESS, PublicPass.abi, signer);
    const txResponse = await contract.storePublicData(id, keys, values);
    await txResponse.wait();
    setTxStatus('Public data stored successfully!');
    return txResponse.hash;
  }

  return (
    <VStack spacing={4} align="stretch" m={5}>
      <Box p={5} shadow="md" borderWidth="1px" borderRadius="lg">
        <FormControl>
          <FormLabel htmlFor="dpp-id">DPP ID</FormLabel>
          <Input id="dpp-id" value={id} onChange={e => setId(e.target.value)} placeholder="Enter DPP ID" size="lg" />
        </FormControl>
        {entries.map((entry, index) => (
          <Box key={index} mt={4}>
            <Flex>
              <Input placeholder="Key" value={entry.key} onChange={e => handleEntryChange(index, 'key', e.target.value)} />
              <Input ml={2} placeholder="Value" value={entry.value} onChange={e => handleEntryChange(index, 'value', e.target.value)} />
              <Select ml={2} value={entry.type} onChange={e => handleEntryChange(index, 'type', e.target.value)}>
                <option value="public">Public</option>
                <option value="private">Private</option>
              </Select>
              {entries.length > 1 && (
                <Button ml={2} colorScheme="red" onClick={() => handleRemoveEntry(index)} size="md" iconSpacing={1}>
                  <IoClose size="3.5em" />
                </Button>
              )}
            </Flex>
            {entry.type === 'private' && entry.allowedAddresses.map((address, addrIdx) => (
              <Flex key={addrIdx} mt={2}>
                <Input placeholder="Allowed Address" value={address} onChange={e => handleAddressChange(index, addrIdx, e.target.value)} />
                <Button ml={2} colorScheme="red" onClick={() => handleRemoveAddress(index, addrIdx)} size="md" iconSpacing={1}>
                  <IoClose size="1em" />
                </Button>
              </Flex>
            ))}
            {entry.type === 'private' && (
              <Button mt={2} onClick={() => handleAddAddress(index)}>Add Address</Button>
            )}
          </Box>
        ))}
        <Flex mt={4} gap="10px">
          <Button colorScheme="teal" onClick={handleAddEntry}>Add Entry</Button>
          <Button colorScheme="blue" onClick={handleCreateDPP}>Create DPP</Button>
        </Flex>
        {txStatus && <Text mt={4} color="green.500">{txStatus}</Text>}
        {txHashes.map((tx, index) => (
          <Link key={index} href={tx.type === 'private' ? `http://3.67.93.162:5000/checker/${tx.hash}` : `https://explorer.apothem.network/tx/${tx.hash}`} isExternal>
            <Text color="blue.500">{tx.type} Transaction Hash: {tx.hash}</Text>
          </Link>
        ))}
      </Box>
    </VStack>
  );
};

export default CreateDPP;
