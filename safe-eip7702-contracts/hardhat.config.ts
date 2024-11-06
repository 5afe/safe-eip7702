import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-ethers";
import "@nomicfoundation/hardhat-toolbox";
import dotenv from "dotenv";
import 'hardhat-deploy'
import { HttpNetworkUserConfig } from "hardhat/types";

dotenv.config();

const { CUSTOM_NODE_URL, LOCALHOST_NODE_URL } = process.env;

// const DEFAULT_MNEMONIC = "candy maple cake sugar pudding cream honey rich smooth crumble sweet treat";
// Function to get all keys matching the pattern PK{number}
const getPrivateKeys = () => {
    return Object.keys(process.env)
        .filter(key => /^PK\d+$/.test(key))
        .map(key => process.env[key] as string);
};

const privateKeys = getPrivateKeys();

const sharedNetworkConfig: HttpNetworkUserConfig = {};
if (privateKeys.length >= 2) {
    sharedNetworkConfig.accounts = privateKeys;
} else {
    throw new Error("At least 2 private keys must be provided in .env");
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
        viaIR: false,
        evmVersion: "paris",
    }
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
            ...sharedNetworkConfig,
            url: LOCALHOST_NODE_URL || "http://localhost:8545",
            allowUnlimitedContractSize: true
        },
        hardhat: {
            allowUnlimitedContractSize: true
        },
        sepolia: {
            ...sharedNetworkConfig,
            url: "https://rpc.ankr.com/eth_sepolia",
        },
        pectra:{
            ...sharedNetworkConfig,
            url: "https://rpc.pectra-devnet-4.ethpandaops.io",
            gasPrice: 50_000_000_000,
            gas: 1_000_000_000,
            timeout: 100000000,
        },
        ithaca:{
            ...sharedNetworkConfig,
            url: "https://odyssey.ithaca.xyz",
            timeout: 100000000,
        },
        ...customNetwork,
    },
    solidity: {
        compilers: [compilerSettings],
    },
    namedAccounts: {
      deployer: 0,
      relayer: 1,
      delegator: 2
    },
    mocha: {
        timeout: 100000000
    },
};

export default config;
