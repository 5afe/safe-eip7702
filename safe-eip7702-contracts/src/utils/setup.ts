import hre, { ethers } from "hardhat";
import { IDAFallbackHandler, ISafe } from "../../typechain-types";
import SafeProxyFactory from "@safe-global/safe-smart-account/build/artifacts/contracts/proxies/SafeProxyFactory.sol/SafeProxyFactory.json";
import SafeL2 from "@safe-global/safe-smart-account/build/artifacts/contracts/SafeL2.sol/SafeL2.json";
import CompatibilityFallbackHandler from "@safe-global/safe-smart-account/build/artifacts/contracts/handler/CompatibilityFallbackHandler.sol/CompatibilityFallbackHandler.json";
import MultiSendCallOnly from "@safe-global/safe-smart-account/build/artifacts/contracts/libraries/MultiSendCallOnly.sol/MultiSendCallOnly.json";
import MultiSend from "@safe-global/safe-smart-account/build/artifacts/contracts/libraries/MultiSend.sol/MultiSend.json";
import { Address } from "hardhat-deploy/types";

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

export const getSafeEIP7702ProxyFactory = async () => {
    const safeEIP7702ProxyFactory = await hre.deployments.get("SafeEIP7702ProxyFactory");
    return ethers.getContractAt("SafeEIP7702ProxyFactory", safeEIP7702ProxyFactory.address);
};

export const getMultiSendCallOnly = async () => {
    const multiSendCallOnly = await hre.deployments.get("MultiSendCallOnly");
    return ethers.getContractAt(MultiSendCallOnly.abi, multiSendCallOnly.address);
};

export const getMultiSend = async () => {
    const multiSend = await hre.deployments.get("MultiSend");
    return ethers.getContractAt(MultiSend.abi, multiSend.address);
};

export const getSafeLite = async () => {
    const safeLite = await hre.deployments.get("SafeLite");
    return ethers.getContractAt("SafeLite", safeLite.address);
}

export const getSafeLiteAtAddress = async (address: Address) => {
    return ethers.getContractAt("SafeLite", address);
}