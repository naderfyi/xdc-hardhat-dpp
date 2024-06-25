import React, { useState } from 'react';
import { ethers } from 'ethers';
import { Box, Button, Input, Text, VStack, useToast } from '@chakra-ui/react';
import PrivatePass from '../../contracts/PrivatePass.json';
import PublicPass from '../../contracts/PublicPass.json';
import { config } from '../../config';
import { switchNetwork } from '../../utils/switchNetwork';

const ViewDPP = ({ signer }) => {
  const [id, setId] = useState('');
  const [privateData, setPrivateData] = useState('');
  const [publicData, setPublicData] = useState('');
  const [error, setError] = useState('');
  const toast = useToast();

  async function validateNetwork(expectedChainId) {
    const currentNetwork = await signer.provider.getNetwork();
    const currentChainIdInt = parseInt(currentNetwork.chainId);
    const expectedChainIdInt = parseInt(expectedChainId);

    if (currentChainIdInt !== expectedChainIdInt) {
      throw new Error(`Network mismatch: expected ${expectedChainIdInt}, but got ${currentChainIdInt}`);
    }
  }

  async function switchAndRefreshNetwork(targetNetwork) {
    await switchNetwork(targetNetwork);
    refreshSigner(); // Ensure the signer is updated
  }
  
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
      setError('Data not found or ID not found.');
      setTimeout(() => setError(''), 2000); // Error message disappears after 5 seconds
      toast({
        title: "Error fetching data",
        description: "Data not found or ID not found.",
        status: "error",
        duration: 2000,
        isClosable: true,
      });
    }
  };

  const handleFetchData = async () => {
    setError('');
    setPrivateData('');
    setPublicData('');
    try {
      await switchAndRefreshNetwork('private');
      await validateNetwork(config.SUBNET_CHAIN_ID);
      const privatePassContract = new ethers.Contract(config.PRIVATE_PASS_ADDRESS, PrivatePass.abi, signer);
      await fetchDataFromContract(privatePassContract, 'getPrivateData', setPrivateData);

      await switchAndRefreshNetwork('public');
      await validateNetwork(config.APOTHEM_CHAIN_ID);
      const publicPassContract = new ethers.Contract(config.PUBLIC_PASS_ADDRESS, PublicPass.abi, signer);
      await fetchDataFromContract(publicPassContract, 'getPublicData', setPublicData);

    } catch (error) {
      console.error('Network or fetching error:', error);
      setError(error.message);
      setTimeout(() => setError(''), 2000); // Error message disappears after 2 seconds
      toast({
        title: "Network or fetching error",
        description: error.message,
        status: "error",
        duration: 2000,
        isClosable: true,
      });
    }
  };

  return (
    <VStack spacing={4} align="stretch">
      <Box p={5} shadow="md" borderWidth="1px" borderRadius="lg">
        <Text fontSize="2xl" mb="4">View Digital Product Passport</Text>
        <Input
          placeholder="DPP ID"
          value={id}
          onChange={e => {
            setId(e.target.value);
            setPrivateData(''); // Clearing the data fields when a new ID is inputted
            setPublicData('');
          }}
          size="lg"
        />
        <Button colorScheme="blue" onClick={handleFetchData} mt="4">Fetch Data</Button>
      </Box>
      <Box p={5} shadow="md" borderWidth="1px" borderRadius="lg" bg="gray.50">
        <Text fontSize="xl" mb="2">Private Data</Text>
        <Text fontSize="md" mb="4">{privateData || "No private data available"}</Text>
        <Text fontSize="xl" mb="2">Public Data</Text>
        <Text fontSize="md">{publicData || "No public data available"}</Text>
        {error && <Text color="red.500">{error}</Text>}
      </Box>
    </VStack>
  );
};

export default ViewDPP;
