import { AddressLike, Provider } from "ethers";
import { FALLBACK_HANDLER_STORAGE_SLOT, GUARD_STORAGE_SLOT, readModuleStorageSlot, readOwnerStorageSlot, SENTINEL_ADDRESS } from "./safe";
import { ethers } from "hardhat";
import { ACCOUNT_CODE_PREFIX } from "../eip7702/helper";
import SafeL2 from "@safe-global/safe-smart-account/build/artifacts/contracts/SafeL2.sol/SafeL2.json";

export const readStorage = async (provider: Provider, account: AddressLike) => {
    console.log("---- fallback handler ----");
    console.log(await provider.getStorage(account, FALLBACK_HANDLER_STORAGE_SLOT));

    console.log("---- guard ----");
    console.log(await provider.getStorage(account, GUARD_STORAGE_SLOT));

    for (let i = 0; i <= 4; i++) {
        console.log(`---- slot ${i} ----`);
        console.log(await provider.getStorage(account, i));
    }
};

export const printAccountStorage = async (provider: Provider, account: AddressLike, safeSingleton: AddressLike | null) => {
    await readStorage(provider, account);
    console.log("account: ", account.toString());
    console.log("code: ", await provider.getCode(account));
    if (safeSingleton && (await provider.getCode(account)) === ethers.concat([ACCOUNT_CODE_PREFIX, safeSingleton.toString()])) {
        const safe = await ethers.getContractAt(SafeL2.abi, account.toString());
        console.log("owners: ", await safe.getOwners());
        console.log("threshold: ", await safe.getThreshold());
        console.log("modules: ", await safe.getModulesPaginated("0x0000000000000000000000000000000000000001", 10));
    }

    console.log("module pointer at sentinel address: ", await readModuleStorageSlot(provider, account, SENTINEL_ADDRESS));
    console.log("owner pointer at sentinel address: ", await readOwnerStorageSlot(provider, account, SENTINEL_ADDRESS));
};
