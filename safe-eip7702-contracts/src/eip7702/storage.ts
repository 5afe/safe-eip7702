import { AddressLike, Provider } from "ethers";
import { ACCOUNT_CODE_PREFIX } from "./helper";
import { ethers } from "hardhat";

export const isAccountDelegated = async (provider: Provider, account: AddressLike) => {
    const codeAtEOA = await provider.getCode(account);
    return codeAtEOA.length === 48 && codeAtEOA.startsWith(ACCOUNT_CODE_PREFIX);
};

export const isAccountDelegatedToAddress = async (provider: Provider, account: AddressLike, authority: string) => {
    const codeAtEOA = await provider.getCode(account);
    return (
        codeAtEOA.length === 48 && codeAtEOA.startsWith(ACCOUNT_CODE_PREFIX) && ethers.getAddress("0x" + codeAtEOA.slice(8)) === authority
    );
};

export const getDelegatedToAddress = async (provider: Provider, account: AddressLike): Promise<string> => {
    const codeAtEOA = await provider.getCode(account);
    return "0x" + codeAtEOA.slice(8);
};
