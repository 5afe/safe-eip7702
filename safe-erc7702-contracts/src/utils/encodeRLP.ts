import { accessListify, AccessListish, BigNumberish, concat, encodeRlp, getBigInt, Signature, toBeArray } from "ethers";

export type AuthorizationListEntryAny = { chainId: bigint; address: string; nonce: bigint; yParity: any; r: any; s: any };

export type AuthorizationListEntry = {
    chainId: Uint8Array;
    address: string;
    nonce: Uint8Array;
    yParity: Uint8Array;
    r: Uint8Array;
    s: Uint8Array;
};

export type AuthorizationList = Array<AuthorizationListEntry>;

export type AuthEntry7702RLPType = [Uint8Array, string, Uint8Array, Uint8Array, Uint8Array, Uint8Array];

export type Auth7702RLPType = Array<AuthEntry7702RLPType>;

export type AuthorizationListish = AuthorizationList | Auth7702RLPType;

const formatNumber = (_value: BigNumberish): Uint8Array => {
    const value = getBigInt(_value, "value");
    return toBeArray(value);
};

const formatAccessList = (value: AccessListish): Array<[string, Array<string>]> => {
    return accessListify(value).map((set) => [set.address, set.storageKeys]);
};

export const encodeRLPAuthorizationEntryUnsigned = (chainId: bigint, address: any, nonce: bigint): string => {
    // MAGIC = "0x05" defined in ERC-7702
    return concat(["0x05", encodeRlp([formatNumber(chainId), address, formatNumber(nonce)])]);
};

const formatAuthorizationEntry = (set: AuthorizationListEntryAny): AuthEntry7702RLPType => {
    return [formatNumber(set.chainId), set.address, formatNumber(set.nonce), formatNumber(set.yParity), toBeArray(set.r), toBeArray(set.s)];
};

const formatAuthorizationList = (value: AuthorizationListEntryAny[]): Auth7702RLPType => {
    return value.map((set: AuthorizationListEntryAny) => formatAuthorizationEntry(set));
};

export const serializeEip7702 = (tx: any, sig: null | Signature): string => {
    const fields: Array<any> = [
        formatNumber(tx.chainId),
        formatNumber(tx.nonce),
        formatNumber(tx.maxPriorityFeePerGas || 0),
        formatNumber(tx.maxFeePerGas || 0),
        formatNumber(tx.gasLimit),
        tx.to,
        formatNumber(tx.value),
        tx.data,
        formatAccessList(tx.accessList || []),
        formatAuthorizationList(tx.authorizationList || []),
    ];

    if (sig) {
        fields.push(formatNumber(sig.yParity));
        fields.push(toBeArray(sig.r));
        fields.push(toBeArray(sig.s));
    }

    return concat(["0x04", encodeRlp(fields)]);
};
