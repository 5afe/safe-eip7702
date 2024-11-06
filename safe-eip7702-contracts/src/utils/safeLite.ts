import { keccak256, toUtf8Bytes, solidityPacked, AbiCoder, BigNumberish, Signature, ethers, Provider, Wallet } from 'ethers';

const defaultAbiCoder = AbiCoder.defaultAbiCoder();

export const MULTISEND_TYPEHASH = keccak256(
    toUtf8Bytes(
        "MultiSend(bytes32 data,uint256 nonce)"
    )
);

export const DOMAIN_TYPEHASH = keccak256(
    toUtf8Bytes(
        "EIP712Domain(uint256 chainId,address verifyingContract)"
    )
);

export const getSignature = async (
    provider: Provider,
    signer: Wallet,
    transactions: string,  // assuming transactions is a hex string
    nonce: number,
    contractAddress: string
): Promise<{ r: string, vs: string }> => {
    const { chainId } = await provider.getNetwork();
    const domain = {
        chainId: chainId,
        verifyingContract: contractAddress,
    };

    const types = {
        MultiSend: [
            { name: "data", type: "bytes32" },
            { name: "nonce", type: "uint256" }
        ]
    };

    const transactionsHash = keccak256(transactions);

    const message = {
        data: transactionsHash,
        nonce: nonce
    };

    // Generate the signature
    const signature = await signer.signTypedData(domain, types, message);
    const s = Signature.from(signature);
    return {
        r: s.r,
        vs: s.yParityAndS
    };
}

export const getStorageSlot = (): string => {
        return ethers.toBeHex(BigInt("0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff00") & BigInt(keccak256(toUtf8Bytes("SafeLite"))));
}