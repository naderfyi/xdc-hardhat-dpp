import React, { useState, useEffect, useCallback } from 'react';
import { Web3Provider } from '@ethersproject/providers';
import { switchNetwork as importedSwitchNetwork } from '../../utils/switchNetwork';
import './ConnectWallet.css';

function ConnectWallet({ setProvider, switchNetwork = importedSwitchNetwork }) {
  const [walletConnected, setWalletConnected] = useState(false);

  const handleAccountsChanged = useCallback(async (accounts) => {
    if (accounts.length === 0) {
      console.log('Please connect to MetaMask.');
      setWalletConnected(false);
      setProvider(null);
    } else {
      const provider = new Web3Provider(window.ethereum);
      setProvider(provider);
      setWalletConnected(true);
      await switchNetwork(); // Ensure the network is switched upon account change
    }
  }, [setProvider, switchNetwork]);

  const handleChainChanged = useCallback((chainId) => {
    console.log(`Chain changed to ${chainId}`);
    const provider = new Web3Provider(window.ethereum);
    setProvider(provider); // Update provider whenever the chain changes
  }, [setProvider]);

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
    if (!window.ethereum) {
      alert('Please install MetaMask!');
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
    <div className="connect-wallet">
      {walletConnected ? (
        <>
          <p className="status">Wallet Connected</p>
          <button className="button disconnect" onClick={disconnectWalletHandler}>Disconnect Wallet</button>
        </>
      ) : (
        <button className="button connect" onClick={connectWalletHandler}>Connect Wallet</button>
      )}
    </div>
  );
}

export default ConnectWallet;
