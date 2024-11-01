import { ethers } from "hardhat";
import { AddressLike, BigNumberish, ContractTransactionResponse, Provider, Signer } from "ethers";
import SafeL2 from "@safe-global/safe-smart-account/build/artifacts/contracts/SafeL2.sol/SafeL2.json";
import { ISafe } from "@safe-global/safe-smart-account/dist/typechain-types";

export const execTransaction = async (
    relayer: Signer,
    wallets: Signer[],
    safe: ISafe,
    to: string,
    value: string,
    data: string,
    operation: string,
): Promise<ContractTransactionResponse> => {
    const nonce = await safe.nonce();

    const transactionHash = await safe.getTransactionHash(
        to,
        value,
        data,
        operation,
        0,
        0,
        0,
        ethers.ZeroAddress,
        ethers.ZeroAddress,
        nonce,
    );
    let signatureBytes = "0x";
    let bytesDataHash = ethers.toBeArray(transactionHash);

    const comparableArray = await Promise.all(wallets.map(async (x: Signer) => [await x.getAddress(), x]));
    comparableArray.sort((a, b) => a[0].toString().localeCompare(b[0].toString(), "en", { sensitivity: "base" }));
    const sorted: Signer[] = comparableArray.map((x) => x[1] as Signer);

    for (let i = 0; i < sorted.length; i++) {
        let flatSig = (await sorted[i].signMessage(bytesDataHash)).replace(/1b$/, "1f").replace(/1c$/, "20");
        signatureBytes += flatSig.slice(2);
    }

    return await safe
        .connect(relayer)
        .execTransaction(to, value, data, operation, 0, 0, 0, ethers.ZeroAddress, ethers.ZeroAddress, signatureBytes);
};

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

export const getSetupData = (owners: AddressLike[], threshold?: number, to?: AddressLike, modules?: AddressLike[], fallbackHandler?: AddressLike, paymentToken: AddressLike = ethers.ZeroAddress, payment: BigNumberish = 0, paymentReceiver: AddressLike = ethers.ZeroAddress): string => {
    const safeInterface = new ethers.Interface(SafeL2.abi);
    const safeModuleSetupInterface = new ethers.Interface(["function enableModules(address[])"]);
    return safeInterface.encodeFunctionData("setup", [
        owners,
        threshold || 0,
        to || ethers.ZeroAddress,
        module !== undefined ? safeModuleSetupInterface.encodeFunctionData("enableModules", [modules]) : ethers.ZeroAddress,
        fallbackHandler || ethers.ZeroAddress,
        paymentToken,
        payment,
        paymentReceiver,
    ]);
};

export const FALLBACK_HANDLER_STORAGE_SLOT = "0x6c9a6c4a39284e37ed1cf53d337577d14212a4870fb976a4366c693b939918d5";
export const GUARD_STORAGE_SLOT = "0x4a204f620c8c5ccdca3fd54d003badd85ba500436a431f0cbda4f558c93c34c8";
export const SENTINEL_ADDRESS = "0x0000000000000000000000000000000000000001";
