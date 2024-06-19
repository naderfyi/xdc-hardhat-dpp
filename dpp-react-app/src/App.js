import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import ConnectWallet from './components/ConnectWallet/ConnectWallet';
import CreateDPP from './components/CreateDPP/CreateDPP';
import ViewDPP from './components/ViewDPP/ViewDPP';

function App() {
  const [provider, setProvider] = useState(null);
  const [signer, setSigner] = useState(null);

  // Update signer whenever provider changes
  useEffect(() => {
    if (provider) {
      setSigner(provider.getSigner());
    } else {
      setSigner(null);
    }
  }, [provider]);

  return (
    <Router>
      <div className="App">
        <Header provider={provider} handleProvider={setProvider} />
        <MainContent provider={provider} signer={signer} />
      </div>
    </Router>
  );
}

function Header({ provider, handleProvider }) {
  return (
    <header>
      <h1>Digital Product Passport Application</h1>
      <nav>
        <ul>
          <li><Link to="/">Home</Link></li>
          {provider && (
            <>
              <li><Link to="/create-dpp">Create DPP</Link></li>
              <li><Link to="/view-dpp">View DPP</Link></li>
            </>
          )}
        </ul>
      </nav>
      <ConnectWallet setProvider={handleProvider} />
    </header>
  );
}

function MainContent({ provider, signer }) {
  return (
    <main>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/create-dpp" element={signer ? <CreateDPP signer={signer} /> : <NoWalletConnected />} />
        <Route path="/view-dpp" element={provider ? <ViewDPP provider={provider} /> : <NoWalletConnected />} />
      </Routes>
    </main>
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
