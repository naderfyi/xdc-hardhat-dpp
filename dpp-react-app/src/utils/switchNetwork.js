import { config } from '../config';

export const switchNetwork = async (dataCategory) => {
  const chainIdHex = (chainId) => {
    // Ensuring the chain ID is in hexadecimal
    const chainIdDecimal = parseInt(chainId);
    return `0x${chainIdDecimal.toString(16)}`;
  };

  const networkData = dataCategory === 'private' ? {
    chainId: chainIdHex(config.SUBNET_CHAIN_ID), // Hexadecimal chain ID for XDC Subnet
    rpcUrls: [config.SUBNET_NETWORK_URL],
    chainName: 'localsubnet',
    nativeCurrency: {
      name: '0X',
      symbol: '0X',
      decimals: 18
    },
    blockExplorerUrls: ['https://explorer.xinfin.network/']
  } : {
    chainId: chainIdHex(config.APOTHEM_CHAIN_ID), // Hexadecimal chain ID for Apothem
    rpcUrls: [config.APOTHEM_NETWORK_URL],
    chainName: 'XDC Apothem TestNet',
    nativeCurrency: {
      name: 'TXDC',
      symbol: 'TXDC',
      decimals: 18
    },
    blockExplorerUrls: ['https://explorer.apothem.network/']
  };

  try {
    await window.ethereum.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: networkData.chainId }],
    });
    // Check if the network switch was successful
    const currentChainId = await window.ethereum.request({ method: 'eth_chainId' });
    if (currentChainId.toLowerCase() !== networkData.chainId.toLowerCase()) {
      throw new Error('Network switch failed. Current chainId is different from the target chainId.');
    }
  } catch (switchError) {
    if (switchError.code === 4902) {
      try {
        await window.ethereum.request({
          method: 'wallet_addEthereumChain',
          params: [networkData],
        });
      } catch (addError) {
        console.error('Failed to add the network:', addError);
        throw addError; // Rethrow to handle this error externally if necessary
      }
    } else {
      console.error('Failed to switch the network:', switchError);
      throw switchError; // Rethrow to handle this error externally if necessary
    }
  }
};
