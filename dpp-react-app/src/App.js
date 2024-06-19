// src/App.js
import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import ConnectWallet from './components/ConnectWallet/ConnectWallet';
import CreateDPP from './components/CreateDPP/CreateDPP';
import ViewDPP from './components/ViewDPP/ViewDPP';

function App() {
  const [provider, setProvider] = useState(null);
  const [signer, setSigner] = useState(null);

  // React to provider changes
  const handleProvider = (newProvider) => {
    setProvider(newProvider);
    if (newProvider) {
      const newSigner = newProvider.getSigner();
      setSigner(newSigner);
    } else {
      setSigner(null);
    }
  };

  return (
    <Router>
      <div className="App">
        <header>
          <h1>Digital Product Passport Application</h1>
          <nav>
            <ul>
              <li><Link to="/">Home</Link></li>
              <li><Link to="/create-dpp">Create DPP</Link></li>
              <li><Link to="/view-dpp">View DPP</Link></li>
            </ul>
          </nav>
          <ConnectWallet setProvider={handleProvider} />
        </header>

        <main>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/create-dpp" element={signer ? <CreateDPP signer={signer} /> : <NoWalletConnected />} />
            <Route path="/view-dpp" element={provider ? <ViewDPP provider={provider} /> : <NoWalletConnected />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

function Home() {
  return (
    <div>
      <h2>Welcome to the Digital Product Passport Application</h2>
      <p>Connect your wallet to get started.</p>
    </div>
  );
}

function NoWalletConnected() {
  return (
    <div>
      <h3>No Wallet Connected</h3>
      <p>Please connect your wallet to access this feature.</p>
    </div>
  );
}

export default App;
