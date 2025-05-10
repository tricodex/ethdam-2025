/** @type import('hardhat/config').HardhatUserConfig */
require('@oasisprotocol/sapphire-hardhat');
require('@nomicfoundation/hardhat-ethers');

module.exports = {
  solidity: "0.8.19",
  networks: {
    'sapphire-testnet': {
      url: process.env.WEB3_PROVIDER || 'https://testnet.sapphire.oasis.io',
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
      chainId: 23295,
    },
  },
  paths: {
    sources: "./contracts",
    artifacts: "./artifacts",
  },
}; 