import { ethers } from "hardhat";
import { ISafe } from "../../typechain-types";
import { ContractTransactionResponse, Signer } from "ethers";

const { toUtf8Bytes } = ethers;

const PERMIT_TYPEHASH = ethers.keccak256(
    ethers.toUtf8Bytes("TokenTransfer(uint256 amount,address _beneficiary, uint256 nonce, uint256 deadline)"),
);

// function getDigest(name, address, chainId, amount, user, nonce, deadline) {
//   const DOMAIN_SEPARATOR = getDomainSeparator(name, address, chainId);
//   return keccak256(
//     solidityPack(
//       ["bytes1", "bytes1", "bytes32", "bytes32"],
//       [
//         "0x19",
//         "0x01",
//         DOMAIN_SEPARATOR,
//         keccak256(
//           defaultAbiCoder.encode(
//             ["bytes32", "uint256", "address", "uint256", "uint256"],
//             [PERMIT_TYPEHASH, amount, user, nonce, deadline]
//           )
//         ),
//       ]
//     )
//   );
// }

// Gets the EIP712 domain separator
const getDomainSeparator = (name: string, contractAddress: string, chainId: string) => {
    return ethers.keccak256(
        ethers.AbiCoder.defaultAbiCoder().encode(
            ["bytes32", "bytes32", "bytes32", "uint256", "address"],
            [
                ethers.keccak256(ethers.toUtf8Bytes("EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)")),
                ethers.keccak256(toUtf8Bytes(name)),
                ethers.keccak256(toUtf8Bytes("1")),
                chainId,
                contractAddress,
            ],
        ),
    );
};

export const execTransaction = async (
    relayer: Signer,
    wallets: Signer[],
    safe: ISafe,
    to: string,
    value: string,
    data: string,
    operation: string,
): Promise<ContractTransactionResponse> => {
    let nonce = await safe.nonce();

    let transactionHash = await safe.getTransactionHash(to, value, data, operation, 0, 0, 0, ethers.ZeroAddress, ethers.ZeroAddress, nonce);
    let signatureBytes = "0x";
    let bytesDataHash = ethers.toBeArray(transactionHash);

    const comparableArray = await Promise.all(wallets.map(async (x: Signer) => [await x.getAddress(), x]));
    comparableArray.sort((a, b) => a[0].toString().localeCompare(b[0].toString(), "en", { sensitivity: "base" }));
    const sorted: Signer[] = comparableArray.map((x) => x[1] as Signer);

    //   const sorted = Array.from(wallets).sort((a: Signer, b: Signer) => {
    //     return a.address.localeCompare(b.address, "en", { sensitivity: "base" });
    //   });

    for (let i = 0; i < sorted.length; i++) {
        let flatSig = (await sorted[i].signMessage(bytesDataHash)).replace(/1b$/, "1f").replace(/1c$/, "20");
        signatureBytes += flatSig.slice(2);
    }

    return await safe
        .connect(relayer)
        .execTransaction(to, value, data, operation, 0, 0, 0, ethers.ZeroAddress, ethers.ZeroAddress, signatureBytes);
};

module.exports = {
    PERMIT_TYPEHASH,
    execTransaction,
    // getDigest,
    getDomainSeparator,
};
