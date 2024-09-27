import { deployments, ethers } from "hardhat";
import hre from "hardhat";
import {
    getSafeSingleton,
    getFallbackHandler,
    getSafeProxyFactory,
    getCompatibilityFallbackHandler,
    getSafeAtAddress,
} from "./utils/setup";
import { SigningKey } from "ethers";
import { serializeEip7702, encodeRLPAuthorizationEntryUnsigned } from "./utils/encodeRLP";
import { expect } from "chai";

describe("FallbackHandler", () => {
    const setupTests = deployments.createFixture(async ({ deployments }) => {
        await deployments.fixture();
        const [deployer, relayer, delegator] = await ethers.getSigners();
        const fallbackHandler = await getFallbackHandler();
        const safeProxyFactory = await getSafeProxyFactory();
        const safeSingleton = await getSafeSingleton();
        const safeCompatibilityFallbackHandler = await getCompatibilityFallbackHandler();
        return { fallbackHandler, safeProxyFactory, safeSingleton, safeCompatibilityFallbackHandler, deployer, relayer, delegator };
    });

    describe("Authorize Tx", function () {
        it("Give authority to Safe", async () => {
            const { safeSingleton, safeCompatibilityFallbackHandler, relayer, deployer, delegator } = await setupTests();
            const pkDelegator = process.env.PK3 || "";
            const pkRelayer = process.env.PK2 || "";

            const delegatorSigningKey = new ethers.Wallet(pkDelegator, hre.ethers.provider);
            const relayerSigningKey = new SigningKey(pkRelayer);
            const relayerWallet = new ethers.Wallet(pkRelayer, hre.ethers.provider);

            const chainId = (await ethers.provider.getNetwork()).chainId;
            const authNonce = BigInt(await delegatorSigningKey.getNonce());
            const authAddress = await safeSingleton.getAddress();

            console.log(`---- code at account ${await delegatorSigningKey.getAddress()}----`);
            console.log(await ethers.provider.getCode(await delegatorSigningKey.getAddress()));
            console.log("--------");

            const dataToSign = encodeRLPAuthorizationEntryUnsigned(chainId, authAddress, authNonce);
            const authHash = ethers.keccak256(dataToSign);

            const authSignature = new SigningKey(pkDelegator).sign(authHash);
            console.log("authSignature", authSignature);

            // [[chain_id, address, nonce, y_parity, r, s]]
            const authorizationList: any = [
                {
                    chainId: chainId,
                    address: authAddress,
                    nonce: authNonce,
                    yParity: authSignature.yParity,
                    r: authSignature.r,
                    s: authSignature.s,
                },
            ];

            let tx = {
                from: await relayerWallet.getAddress(),
                nonce: await relayerWallet.getNonce(),
                gasLimit: ethers.toBeHex(21000000),
                gasPrice: ethers.toBeHex(3100),
                data: "0x",
                to: delegatorSigningKey.address,
                value: "0x1",
                chainId: (await ethers.provider.getNetwork()).chainId,
                type: 4,
                maxFeePerGas: ethers.toBeHex(30000),
                maxPriorityFeePerGas: ethers.toBeHex(30000),
                accessList: [],
                authorizationList: authorizationList,
            };
            console.log("tx", tx);

            const encodedTx = serializeEip7702(tx, null);
            const txHashToSign = ethers.keccak256(encodedTx);
            console.log("unSignedTxHash", txHashToSign);
            const publicAddress = ethers.computeAddress(relayerSigningKey.publicKey);
            console.log(`--- relayer account ${publicAddress} ---`);
            console.log(`--- signer account ${ethers.recoverAddress(authHash, authSignature)} ---`);

            const signature = relayerSigningKey.sign(txHashToSign);
            console.log("Tx signature", signature);

            const encodedSignedTx = serializeEip7702(tx, signature);
            console.log("Broadcasting transaction");
            const response = await ethers.provider.send("eth_sendRawTransaction", [encodedSignedTx]);
            console.log("Transaction hash", response);

            console.log("Waiting for transaction confirmation");
            const txReceipt = await (await ethers.provider.getTransaction(response))?.wait();
            expect(txReceipt?.status === 1, "Transaction failed");

            const codeAtEOA = await ethers.provider.getCode(await delegatorSigningKey.getAddress());
            console.log(`---- code at account ${await delegatorSigningKey.getAddress()}----`);
            console.log(codeAtEOA);
            console.log("--------");

            expect(codeAtEOA).to.equal(ethers.concat(["0xef0100", await safeSingleton.getAddress()]));

            console.log("Setting owners for account");

            const newOwners = [await deployer.getAddress()];
            const data = safeSingleton.interface.encodeFunctionData("setup", [
                newOwners,
                1,
                ethers.ZeroAddress,
                "0x",
                await safeCompatibilityFallbackHandler.getAddress(),
                ethers.ZeroAddress,
                0,
                ethers.ZeroAddress,
            ]);

            const setupTxReceipt = await relayer.sendTransaction({ to: await delegator.getAddress(), data: data });
            const txResponse = await setupTxReceipt.wait();
            console.log("Transaction response", txResponse);

            const safe = await getSafeAtAddress(await delegator.getAddress());
            console.log(await safe.getOwners());
        });
    });
});
