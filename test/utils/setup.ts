import hre, { ethers } from "hardhat";
import { IDAFallbackHandler, ISafe } from "../../typechain-types";
import SafeProxyFactory from "@safe-global/safe-contracts/build/artifacts/contracts/proxies/SafeProxyFactory.sol/SafeProxyFactory.json";
import SafeL2 from "@safe-global/safe-contracts/build/artifacts/contracts/SafeL2.sol/SafeL2.json";
import CompatibilityFallbackHandler from "@safe-global/safe-contracts/build/artifacts/contracts/handler/CompatibilityFallbackHandler.sol/CompatibilityFallbackHandler.json";

export const getIDAFallbackHandler = async (): Promise<IDAFallbackHandler> => {
    const fallbackHandler = await hre.deployments.get("IDAFallbackHandler");
    return ethers.getContractAt("IDAFallbackHandler", fallbackHandler.address);
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

export const getClearStorageHelper = async () => {
    const clearStorageHelper = await hre.deployments.get("ClearStorageHelper");
    return ethers.getContractAt("ClearStorageHelper", clearStorageHelper.address);
};

export const getSafeModuleSetup = async () => {
    const safeModuleSetup = await hre.deployments.get("SafeModuleSetup");
    return ethers.getContractAt("SafeModuleSetup", safeModuleSetup.address);
};

export const getSafeERC7702ProxyFactory = async () => {
    const safeERC7702ProxyFactory = await hre.deployments.get("SafeERC7702ProxyFactory");
    return ethers.getContractAt("SafeERC7702ProxyFactory", safeERC7702ProxyFactory.address);
}