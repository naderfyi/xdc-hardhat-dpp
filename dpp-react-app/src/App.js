import React, { useState, useEffect } from 'react';
import {
  ChakraProvider,
  Box,
  VStack,
  Text,
  Flex,
  Center, useColorModeValue,
  theme as chakraTheme,
  extendTheme
} from '@chakra-ui/react';
import { BrowserRouter as Router, Routes, Route, Link as RouterLink } from 'react-router-dom';
import ConnectWallet from './components/ConnectWallet/ConnectWallet';
import CreateDPP from './components/CreateDPP/CreateDPP';
import ViewDPP from './components/ViewDPP/ViewDPP';

// Extending the default Chakra theme to include custom colors and components
const theme = extendTheme({
  colors: {
    brand: {
      900: '#1a365d',
      800: '#153e75',
      700: '#2a69ac',
    },
  },
  components: {
    Button: {
      baseStyle: {
        fontWeight: 'bold', // Normally, it is "semibold"
      },
    },
  },
}, chakraTheme);

function App() {
  const [provider, setProvider] = useState(null);
  const [signer, setSigner] = useState(null);

  useEffect(() => {
    if (provider) {
      setSigner(provider.getSigner());
    } else {
      setSigner(null);
    }
  }, [provider]);

  return (
    <ChakraProvider theme={theme}>
      <Router>
        <Box className="App">
          <Header provider={provider} handleProvider={setProvider} />
          <MainContent provider={provider} signer={signer} />
        </Box>
      </Router>
    </ChakraProvider>
  );
}

function Header({ provider, handleProvider }) {
  return (
    <Flex
      as="header"
      width="full"
      align="center"
      justifyContent="space-between"
      padding="4"
      bg="blue.800"
      color="white"
    >
      <Text fontSize="2xl" fontWeight="bold">Digital Product Passport</Text>
      <Box display="flex" alignItems="center">
        <RouterLink to="/" style={{ marginRight: "10px", color: 'white', textDecoration: 'none', padding: '8px' }} _hover={{ textDecoration: 'underline' }}>
          Home
        </RouterLink>
        {provider && (
          <>
            <RouterLink to="/create-dpp" style={{ marginRight: "10px", color: 'white', textDecoration: 'none', padding: '8px' }} _hover={{ textDecoration: 'underline' }}>
              Create DPP
            </RouterLink>
            <RouterLink to="/view-dpp" style={{ color: 'white', textDecoration: 'none', padding: '8px' }} _hover={{ textDecoration: 'underline' }}>
              View DPP
            </RouterLink>
          </>
        )}
      </Box>
      <ConnectWallet setProvider={handleProvider} />
    </Flex>
  );
}

function MainContent({ provider, signer }) {
  return (
    <VStack spacing={8} padding={5} align="center">
      <Routes>
        <Route path="/" element={<Home provider={provider} />} />
        <Route path="/create-dpp" element={signer ? <CreateDPP signer={signer} /> : <NoWalletConnected />} />
        <Route path="/view-dpp" element={provider ? <ViewDPP provider={provider} /> : <NoWalletConnected />} />
      </Routes>
    </VStack>
  );
}

function Home({ provider }) { // provider is passed as a prop here
  const bg = useColorModeValue('gray.50', 'gray.700');
  return (
    <Center bg={bg} p={6} shadow="xl" borderWidth="1px" borderRadius="lg" flex="1">
      <VStack spacing={3}>
        <Text fontSize="2xl" fontWeight="bold">Welcome to the Digital Product Passport</Text>
        {!provider && <Text fontSize="lg">Connect your wallet to get started.</Text>}
      </VStack>
    </Center>
  );
}

function NoWalletConnected() {
  const bg = useColorModeValue('gray.50', 'gray.700');
  return (
    <Center bg={bg} p={6} shadow="xl" borderWidth="1px" borderRadius="lg" flex="1">
      <VStack spacing={3}>
        <Text fontSize="2xl" fontWeight="bold">No Wallet Connected</Text>
        <Text fontSize="lg">Please connect your wallet to access this feature.</Text>
      </VStack>
    </Center>
  );
}

export default App;
