import { ethers, keccak256, SigningKey } from "ethers";
import { encodeRLPAuthorizationEntryUnsigned } from "../utils/encodeRLP";
import { SafeERC7702ProxyFactory } from "../../typechain-types";

export const getAuthorizationList = (chainId: bigint, nonce: bigint, privateKey: ethers.BytesLike, authorizer: string) => {
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

export const calculateProxyAddress = async (
    factory: SafeERC7702ProxyFactory,
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
