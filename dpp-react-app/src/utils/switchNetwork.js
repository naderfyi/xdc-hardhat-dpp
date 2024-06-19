export const switchNetwork = async (dataCategory) => {
  const networkData = dataCategory === 'private' ? {
    chainId: '0xF664', // Hexadecimal chain ID for XDC Subnet
    rpcUrls: ['https://3.67.93.162:8545'],
    chainName: 'localsubnet',
    nativeCurrency: {
      name: '0X',
      symbol: '0X', // 2-6 characters long
      decimals: 18
    },
    blockExplorerUrls: ['https://explorer.xinfin.network/']
  } : {
    chainId: '0x33', // Hexadecimal chain ID for Apothem
    rpcUrls: ['https://rpc.apothem.network'],
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
  } catch (switchError) {
    if (switchError.code === 4902) {
      try {
        await window.ethereum.request({
          method: 'wallet_addEthereumChain',
          params: [networkData],
        });
      } catch (addError) {
        console.error('Failed to add the network:', addError);
      }
    } else {
      console.error('Failed to switch the network:', switchError);
    }
  }
};
