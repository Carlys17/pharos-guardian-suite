import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import * as dotenv from "dotenv";
dotenv.config();

const PRIVATE_KEY = process.env.PRIVATE_KEY || "0x0000000000000000000000000000000000000000000000000000000000000001";

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.28",
    settings: {
      optimizer: { enabled: true, runs: 200 },
    },
  },
  networks: {
    pharos: {
      url: process.env.PHAROS_RPC_URL || "https://atlantic.dplabs-internal.com",
      accounts: [PRIVATE_KEY],
      chainId: 688689,
    },
    pharosTestnet: {
      url: "https://testnet.dplabs-internal.com",
      accounts: [PRIVATE_KEY],
      chainId: 688688,
    },
  },
  etherscan: {
    customChains: [
      {
        network: "pharos",
        chainId: 688689,
        urls: {
          apiURL: "https://api.socialscan.io/pharos-atlantic-testnet/v1/explorer/command_api/contract",
          browserURL: "https://atlantic.pharosscan.xyz/",
        },
      },
    ],
    apiKey: {
      pharos: "placeholder",
    },
  },
};

export default config;
