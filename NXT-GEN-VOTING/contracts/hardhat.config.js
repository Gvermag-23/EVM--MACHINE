import '@nomicfoundation/hardhat-toolbox';
import 'dotenv/config';

export default {
  solidity: {
    version: '0.8.24',
    settings: { optimizer: { enabled: true, runs: 200 } },
  },
  networks: {
    hardhat: { chainId: 31337 },
    localhost: { url: 'http://127.0.0.1:8545' },
    ...(process.env.SEPOLIA_RPC_URL && process.env.PRIVATE_KEY
      ? { sepolia: { url: process.env.SEPOLIA_RPC_URL, accounts: [process.env.PRIVATE_KEY] } }
      : {}),
  },
  etherscan: {
    apiKey: process.env.ETHERSCAN_API_KEY || '',
  },
};