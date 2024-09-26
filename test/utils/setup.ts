import hre, { ethers } from "hardhat";
import { FallbackHandler } from "../../typechain-types";
import SafeProxyFactory from '@safe-global/safe-contracts/build/artifacts/contracts/proxies/SafeProxyFactory.sol/SafeProxyFactory.json';
import SafeL2 from '@safe-global/safe-contracts/build/artifacts/contracts/SafeL2.sol/SafeL2.json';

export const getFallbackHandler = async () : Promise<FallbackHandler> => {
    const fallbackHandler = await hre.deployments.get("FallbackHandler");
    return ethers.getContractAt("FallbackHandler", fallbackHandler.address);
};

export const getSafeSingleton = async () => {
    const safe = await hre.deployments.get("SafeL2");
    return ethers.getContractAt(SafeL2.abi, safe.address);
};

export const getSafeProxyFactory = async () => {
    const safeProxyFactory = await hre.deployments.get("SafeProxyFactory");
    return ethers.getContractAt(SafeProxyFactory.abi, safeProxyFactory.address);
};
