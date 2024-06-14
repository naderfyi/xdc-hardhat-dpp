require("@nomiclabs/hardhat-waffle");
require("dotenv").config({ path: ".env" });

const XINFIN_NETWORK_URL = process.env.XINFIN_NETWORK_URL;
const XINFIN_PRIVATE_KEY = process.env.XINFIN_PRIVATE_KEY;
const SUBNET_NETWORK_URL = process.env.SUBNET_NETWORK_URL;
const SUBNET_PRIVATE_KEY = process.env.SUBNET_PRIVATE_KEY;
const APOTHEM_NETWORK_URL = process.env.APOTHEM_NETWORK_URL;
const APOTHEM_PRIVATE_KEY = process.env.APOTHEM_PRIVATE_KEY;

/**
 * @type import('hardhat/config').HardhatUserConfig
 */

module.exports = {
  solidity: "0.8.0",
  networks: {
    xinfin: {
      url: XINFIN_NETWORK_URL,
      accounts: [`0x${XINFIN_PRIVATE_KEY}`]
    },
    apothem: {
      url: APOTHEM_NETWORK_URL,
      accounts: [`0x${APOTHEM_PRIVATE_KEY}`]
    },
    subnet: {
      url: SUBNET_NETWORK_URL,
      accounts: [`0x${SUBNET_PRIVATE_KEY}`]
    }
  }
  
};