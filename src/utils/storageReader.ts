import { AddressLike, Provider } from "ethers";
import { FALLBACK_HANDLER_STORAGE_SLOT, GUARD_STORAGE_SLOT } from "./safe";
import { ethers } from "hardhat";

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
