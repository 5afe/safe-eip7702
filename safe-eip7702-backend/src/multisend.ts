import { Address, encodePacked, Hex, toBytes } from "viem";


export interface MetaTransaction {
    to: Address;
    value: bigint;
    data: Hex;
    operation: number;
}

const encodeMetaTransaction = (tx: MetaTransaction): string => {
    const data = toBytes(tx.data);
    const encoded = encodePacked(
        ["uint8", "address", "uint256", "uint256", "bytes"],
        [tx.operation, tx.to, tx.value, BigInt(data.length), tx.data],
    );
    return encoded.slice(2);
};

export const encodeMultiSend = (txs: MetaTransaction[]): `0x${string}` => {
    return "0x" + txs.map((tx) => encodeMetaTransaction(tx)).join("") as `0x${string}`;
};
