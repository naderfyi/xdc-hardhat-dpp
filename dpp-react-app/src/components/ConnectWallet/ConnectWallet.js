import React, { useState, useEffect, useCallback } from 'react';
import { Web3Provider } from '@ethersproject/providers';

function ConnectWallet({ setProvider }) {
  const [walletConnected, setWalletConnected] = useState(false);

  const handleAccountsChanged = useCallback((accounts) => {
    if (accounts.length === 0) {
      console.log('Please connect to MetaMask.');
      setWalletConnected(false);
      setProvider(null);
    } else {
      const provider = new Web3Provider(window.ethereum);
      setProvider(provider);
      setWalletConnected(true);
    }
  }, [setProvider]);

  const handleChainChanged = useCallback(() => {
    window.location.reload(); // Recommended by MetaMask to handle chain changes robustly
  }, []);

  const handleDisconnect = useCallback((error) => {
    console.error('Disconnected:', error);
    setWalletConnected(false);
    setProvider(null);
  }, [setProvider]);

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
    if (window.ethereum) {
      try {
        const provider = new Web3Provider(window.ethereum);
        await provider.send("eth_requestAccounts", []); // Request account access
        setProvider(provider);
        setWalletConnected(true);
      } catch (error) {
        console.error('Failed to connect wallet:', error);
      }
    } else {
      alert('Please install MetaMask!');
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
    <div>
      {walletConnected ? (
        <>
          <p>Wallet Connected</p>
          <button onClick={disconnectWalletHandler}>Disconnect Wallet</button>
        </>
      ) : (
        <button onClick={connectWalletHandler}>Connect Wallet</button>
      )}
    </div>
  );
}

export default ConnectWallet;
