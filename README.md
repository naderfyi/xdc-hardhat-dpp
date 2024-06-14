# DBP Project

Deploying and testing DBP smart contracts on the XDC network, on a private subnet and the Apothem testnet.

## Setup

1. **Install Dependencies**

   Install the necessary dependencies for Hardhat, Ethers, Waffle, and Chai.

   ```bash
   npm install --save-dev @nomiclabs/hardhat-ethers ethers @nomiclabs/hardhat-waffle ethereum-waffle chai
   npm install @nomiclabs/hardhat-waffle ethereum-waffle ethers dotenv
   ```

2. **Configure Environment Variables**

   Create a .env file in the root of your project and add your private keys and network URLs.

   ```bash
   XINFIN_NETWORK_URL=your_xinfin_network_url
   XINFIN_PRIVATE_KEY=your_xinfin_private_key
   SUBNET_NETWORK_URL=your_subnet_network_url
   SUBNET_PRIVATE_KEY=your_subnet_private_key
   APOTHEM_NETWORK_URL=your_apothem_network_url
   APOTHEM_PRIVATE_KEY=your_apothem_private_key
   ```

3. **Compile Contracts**

   Compile your smart contracts with Hardhat.

   ```bash
   npx hardhat compile
   ```

4. **Deploy Contracts**

   Deploy your contracts to the subnet.

   ```bash
   npx hardhat run scripts/deploy.js --network subnet
   ```

# Testing

1. **Install Testing Dependencies**

   Install Chai and Chai-as-promised for writing tests.

   ```bash
   npm install --save-dev chai
   npm install chai-as-promised
   ```

2. **Run Tests**

   Run the tests to ensure your contracts work as expected.

   ```bash
   npx hardhat test
   ```

3. **Deploy Steps**

   Compile and deploy your contracts.

   ```bash
   npx hardhat compile
   npx hardhat run scripts/deploy.js --network subnet
   ```