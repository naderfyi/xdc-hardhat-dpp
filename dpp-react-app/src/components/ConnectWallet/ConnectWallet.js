import React, { useState, useEffect, useCallback } from 'react';
import { Web3Provider } from '@ethersproject/providers';
import { Button, useToast, Flex, Text } from '@chakra-ui/react';
import { switchNetwork as importedSwitchNetwork } from '../../utils/switchNetwork';

function ConnectWallet({ setProvider, switchNetwork = importedSwitchNetwork }) {
  const [walletConnected, setWalletConnected] = useState(false);
  const toast = useToast();

  const handleAccountsChanged = useCallback(async (accounts) => {
    if (accounts.length === 0) {
      toast({
        title: 'Wallet disconnected',
        description: "Please connect to MetaMask.",
        status: 'warning',
        duration: 5000,
        isClosable: true,
      });
      setWalletConnected(false);
      setProvider(null);
    } else {
      const provider = new Web3Provider(window.ethereum);
      setProvider(provider);
      setWalletConnected(true);
      await switchNetwork(); // Ensure the network is switched upon account change
    }
  }, [setProvider, switchNetwork, toast]);

  const handleChainChanged = useCallback((chainId) => {
    console.log(`Chain changed to ${chainId}`);
    const provider = new Web3Provider(window.ethereum);
    setProvider(provider); // Update provider whenever the chain changes
    toast({
      title: 'Network Changed',
      description: `Chain changed to ${chainId}`,
      status: 'info',
      duration: 5000,
      isClosable: true,
    });
  }, [setProvider, toast]);

  const handleDisconnect = useCallback((error) => {
    toast({
      title: 'Disconnected',
      description: `Error: ${error}`,
      status: 'error',
      duration: 5000,
      isClosable: true,
    });
    setWalletConnected(false);
    setProvider(null);
  }, [setProvider, toast]);

  useEffect(() => {
    if (window.ethereum) {
      window.ethereum.on('accountsChanged', handleAccountsChanged);
      window.ethereum.on('chainChanged', handleChainChanged);
      window.ethereum.on('disconnect', handleDisconnect);
    }

    return () => {
      if (window.ethereum) {
        window.ethereum.removeListener('accountsChanged', handleAccountsChanged);
        window.ethereum.removeListener('chainChanged', handleChainChanged);
        window.ethereum.removeListener('disconnect', handleDisconnect);
      }
    };
  }, [handleAccountsChanged, handleChainChanged, handleDisconnect]);

  const connectWalletHandler = async () => {
    if (!window.ethereum) {
      toast({
        title: 'MetaMask Required',
        description: 'Please install MetaMask to connect.',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
      return;
    }
    try {
      await window.ethereum.request({ method: "eth_requestAccounts" });
      const provider = new Web3Provider(window.ethereum);
      setProvider(provider);
      setWalletConnected(true);
      await switchNetwork(); // Ensure the correct network upon connecting
    } catch (error) {
      console.error('Failed to connect wallet:', error);
    }
  };

  const disconnectWalletHandler = async () => {
    if (window.ethereum) {
      try {
        await window.ethereum.request({ method: 'eth_requestAccounts', params: [{eth_accounts: {}}] });
        setProvider(null);
        setWalletConnected(false);
      } catch (error) {
        console.error('Failed to disconnect:', error);
      }
    }
  };

  return (
    <Flex direction="column" align="center" justify="center" mt="4">
      {walletConnected ? (
        <>
          <Text mb="2">Wallet Connected</Text>
          <Button colorScheme="red" onClick={disconnectWalletHandler}>Disconnect Wallet</Button>
        </>
      ) : (
        <Button colorScheme="teal" onClick={connectWalletHandler}>Connect Wallet</Button>
      )}
    </Flex>
  );
}

export default ConnectWallet;
