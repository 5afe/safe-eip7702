import { AddressLike, BytesLike, ethers, keccak256, Provider, Signer, SigningKey } from "ethers";
import { AuthorizationListEntryAny, encodeRLPAuthorizationEntryUnsigned, serializeEip7702 } from "../utils/encodeRLP";
import { SafeEIP7702ProxyFactory } from "../../typechain-types";

export const getAuthorizationList = (
    chainId: bigint,
    nonce: bigint,
    privateKey: ethers.BytesLike,
    authorizer: string,
): AuthorizationListEntryAny[] => {
    const dataToSign = encodeRLPAuthorizationEntryUnsigned(chainId, authorizer, nonce);
    const authHash = ethers.keccak256(dataToSign);
    const authSignature = new SigningKey(privateKey).sign(authHash);

    // [[chain_id, address, nonce, y_parity, r, s]]
    return [
        {
            chainId: chainId,
            address: authorizer,
            nonce: nonce,
            yParity: authSignature.yParity,
            r: authSignature.r,
            s: authSignature.s,
        },
    ];
};

export const getSignedTransaction = async (
    provider: Provider,
    relayerSigningKey: SigningKey,
    authorizationList: AuthorizationListEntryAny[],
    to: AddressLike = ethers.ZeroAddress,
    value: ethers.BigNumberish = 0,
    data: BytesLike = "0x",
    nonce?: number
) => {
    const relayerAddress = ethers.computeAddress(relayerSigningKey.publicKey);
    const relayerNonce = nonce || await provider.getTransactionCount(relayerAddress);
    const tx = {
        from: relayerAddress,
        nonce: relayerNonce,
        gasLimit: ethers.toBeHex(21000000),
        gasPrice: ethers.toBeHex(3100),
        data: data,
        to: to,
        value: value,
        chainId: (await provider.getNetwork()).chainId,
        type: 4,
        maxFeePerGas: ethers.toBeHex(30000),
        maxPriorityFeePerGas: ethers.toBeHex(30000),
        accessList: [],
        authorizationList: authorizationList,
    };

    const encodedTx = serializeEip7702(tx, null);
    const txHashToSign = ethers.keccak256(encodedTx);
    const signature = relayerSigningKey.sign(txHashToSign);
    return serializeEip7702(tx, signature);
};

export const calculateProxyAddress = async (
    factory: SafeEIP7702ProxyFactory,
    singleton: string,
    inititalizer: string,
    nonce: number | string,
) => {
    const salt = ethers.solidityPackedKeccak256(["bytes32", "uint256"], [ethers.solidityPackedKeccak256(["bytes"], [inititalizer]), nonce]);
    const factoryAddress = await factory.getAddress();
    const proxyCreationCode = await factory.proxyCreationCode();

    const deploymentCode = ethers.solidityPacked(["bytes", "uint256", "uint256"], [proxyCreationCode, keccak256(inititalizer), singleton]);
    return ethers.getCreate2Address(factoryAddress, salt, ethers.keccak256(deploymentCode));
};

export const ACCOUNT_CODE_PREFIX = "0xef0100";
