import hre, { ethers } from "hardhat";
import { FallbackHandler, ISafe } from "../../typechain-types";
import SafeProxyFactory from "@safe-global/safe-contracts/build/artifacts/contracts/proxies/SafeProxyFactory.sol/SafeProxyFactory.json";
import SafeL2 from "@safe-global/safe-contracts/build/artifacts/contracts/SafeL2.sol/SafeL2.json";
import CompatibilityFallbackHandler from "@safe-global/safe-contracts/build/artifacts/contracts/handler/CompatibilityFallbackHandler.sol/CompatibilityFallbackHandler.json";

export const getFallbackHandler = async (): Promise<FallbackHandler> => {
    const fallbackHandler = await hre.deployments.get("FallbackHandler");
    return ethers.getContractAt("FallbackHandler", fallbackHandler.address);
};

export const getSafeSingleton = async () => {
    const safe = await hre.deployments.get("SafeL2");
    return ethers.getContractAt(SafeL2.abi, safe.address);
};

export const getSafeAtAddress = async (address: string): Promise<ISafe> => {
    return ethers.getContractAt("ISafe", address);
};

export const getSafeProxyFactory = async () => {
    const safeProxyFactory = await hre.deployments.get("SafeProxyFactory");
    return ethers.getContractAt(SafeProxyFactory.abi, safeProxyFactory.address);
};

export const getCompatibilityFallbackHandler = async () => {
    const fallbackHandler = await hre.deployments.get("CompatibilityFallbackHandler");
    return ethers.getContractAt(CompatibilityFallbackHandler.abi, fallbackHandler.address);
};
