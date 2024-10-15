import { PublicClient, Address, keccak256, encodePacked, pad, Hex, toHex, zeroHash, sliceHex, hexToBigInt } from 'viem';

export const FALLBACK_HANDLER_STORAGE_SLOT = "0x6c9a6c4a39284e37ed1cf53d337577d14212a4870fb976a4366c693b939918d5";
export const GUARD_STORAGE_SLOT = "0x4a204f620c8c5ccdca3fd54d003badd85ba500436a431f0cbda4f558c93c34c8";
export const SENTINEL_ADDRESS = "0x0000000000000000000000000000000000000001";

// Function to read module storage slot
export const readModuleStorageSlot = async (
    client: PublicClient, 
    account: Address, 
    key: string
): Promise<Hex> => {
    const moduleStorageSlot = 1n;
    return await readMappingStorage(client, account, moduleStorageSlot, key);
};

// Function to read owner storage slot
export const readOwnerStorageSlot = async (
    client: PublicClient, 
    account: Address, 
    key: string
): Promise<Hex> => {
    const ownerStorageSlot = 2n;
    return await readMappingStorage(client, account, ownerStorageSlot, key);
};

// Function to read a mapping storage slot
export const readMappingStorage = async (
    client: PublicClient, 
    account: Address, 
    storageSlot: bigint, 
    key: string
): Promise<`0x${string}`> => {
    // Pad the key to 32 bytes
    const paddedKey = pad(key as Hex, { size: 32 });
    
    // Convert storage slot to hex and pad it to 32 bytes
    const baseSlot = pad(`0x${storageSlot.toString(16)}` as Hex, { size: 32 });
    
    // Compute the storage slot using keccak256(key + slot)
    const slot = keccak256(encodePacked(['bytes32', 'bytes32'], [paddedKey, baseSlot]));
    
    const value = await client.getStorageAt({ address: account, slot }) || zeroHash;
    console.log(`Storage slot: [${slot}] value [${value}]`);

    // Fetch and return the storage value at the computed slot
    return value;
};

export type SafeStorage = {
    fallbackHandler?: Address,
    singleton: Address,
    nonce: bigint, 
    guard?: Address,
    ownerCount: bigint,
    owners?: Address[],
    modules?: Address[],
    threshold: bigint,
}

export const readStorage = async (client: PublicClient, account: Address): Promise<SafeStorage> => {
    // Fallback Handler Storage
    const fallbackHandler = sliceHex(await client.getStorageAt({ address: account, slot: FALLBACK_HANDLER_STORAGE_SLOT }) || zeroHash, 12, 32);

    // Guard Storage
    const guard = sliceHex(await client.getStorageAt({ address: account, slot: GUARD_STORAGE_SLOT }) || zeroHash, 12, 32);

    // Reading slots 0 to 4
    const singleton = sliceHex(await client.getStorageAt({ address: account, slot: toHex(0) }) || zeroHash, 12, 32);

    const ownerCount = hexToBigInt(await client.getStorageAt({ address: account, slot: toHex(3) }) || zeroHash);
    const threshold = hexToBigInt(await client.getStorageAt({ address: account, slot: toHex(4) })|| zeroHash);
    const nonce = hexToBigInt(await client.getStorageAt({ address: account, slot: toHex(5) })|| zeroHash);

    // Return as a JSON object
    return {
        fallbackHandler,
        guard,
        singleton,
        ownerCount,
        threshold,
        nonce,
    };
};