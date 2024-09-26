import { HardhatUserConfig } from "hardhat/config";
import '@nomicfoundation/hardhat-ethers';
import "@nomicfoundation/hardhat-toolbox";
import dotenv from "dotenv";
import 'hardhat-deploy'
import { HttpNetworkUserConfig } from "hardhat/types";

dotenv.config();

const { CUSTOM_NODE_URL, MNEMONIC, ETHERSCAN_API_KEY, PK } = process.env;

const DEFAULT_MNEMONIC = "candy maple cake sugar pudding cream honey rich smooth crumble sweet treat";

const sharedNetworkConfig: HttpNetworkUserConfig = {};
if (PK) {
    sharedNetworkConfig.accounts = [PK];
} else {
    sharedNetworkConfig.accounts = {
        mnemonic: MNEMONIC || DEFAULT_MNEMONIC,
    };
}

const customNetwork = CUSTOM_NODE_URL
    ? {
          custom: {
              ...sharedNetworkConfig,
              url: CUSTOM_NODE_URL,
          },
      }
    : {};

const compilerSettings = {
    version: "0.8.27",
    settings: {
        optimizer: {
            enabled: true,
            runs: 10_000_000,
        },
        viaIR: true,
        evmVersion: "paris",
    },
};

const config: HardhatUserConfig = {
    paths: {
      artifacts: 'build/artifacts',
      cache: 'build/cache',
      deploy: 'src/deploy',
      sources: 'contracts',
    },
    networks: {
        localhost: {
            url: "http://localhost:8545",
        },
        hardhat: {},
        sepolia: {
            ...sharedNetworkConfig,
            url: "https://rpc.ankr.com/eth_sepolia",
        },
        ...customNetwork,
    },
    solidity: {
        compilers: [compilerSettings],
    },
    namedAccounts: {
      deployer: 0,
    },
};

export default config;
