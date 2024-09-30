import { AddressLike, ethers, Provider } from "ethers";

export const readModuleStorageSlot = async (provider: Provider, account: AddressLike, key: string) => {
    const moduleStorageSlot = 1n;
    return await readMappingStorage(provider, account, moduleStorageSlot, key);
};

export const readOwnerStorageSlot = async (provider: Provider, account: AddressLike, key: string) => {
    const ownerStorageSlot = 2n;
    return await readMappingStorage(provider, account, ownerStorageSlot, key);
};

export const readMappingStorage = async (provider: Provider, account: AddressLike, storageSlot: bigint, key: string) => {
    const paddedKey = ethers.zeroPadValue(key, 32);
    const baseSlot = ethers.zeroPadValue(ethers.toBeHex(storageSlot), 32);
    const slot = ethers.keccak256(ethers.concat([paddedKey, baseSlot]));
    return await provider.getStorage(account, slot);
};
