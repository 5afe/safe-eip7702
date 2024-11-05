import { keccak256, Provider, Signature, SigningKey, Wallet, ZeroAddress } from "ethers";
import { deployments, ethers } from "hardhat";
import { getIDAFallbackHandler, getSafeLite, getSafeLiteAtAddress, getSafeSingleton, getCompatibilityFallbackHandler, getClearStorageHelper, getSafeModuleSetup, getSafeEIP7702ProxyFactory } from "../src/utils/setup";
import { SafeEIP7702ProxyFactory } from "../typechain-types";
import { getAuthorizationList, getSignedTransaction } from "../src/eip7702/helper";
import { expect } from "chai";
import { encodeMultiSend, MetaTransaction } from "@safe-global/safe-smart-account";
import { getSignature, getStorageSlot } from "../src/utils/safeLite";


describe("SafeLite", () => {

    const setupTests = deployments.createFixture(async ({ deployments }) => {
        await deployments.fixture();
        const [deployer] = await ethers.getSigners();
        const fallbackHandler = await getIDAFallbackHandler();
        const safeSingleton = await getSafeSingleton();
        const safeCompatibilityFallbackHandler = await getCompatibilityFallbackHandler();
        const clearStorageHelper = await getClearStorageHelper();
        const safeModuleSetup = await getSafeModuleSetup();
        const safeLite = await getSafeLite();
        const safeEIP7702ProxyFactory: SafeEIP7702ProxyFactory = await getSafeEIP7702ProxyFactory();
        const accountWallet = new ethers.Wallet(ethers.Wallet.createRandom().privateKey, ethers.provider);

        const pkRelayer = process.env.PK2 || "";
        const relayerSigningKey = new SigningKey(pkRelayer);

        const amount = 1_000_000_000_000
        if (await ethers.provider.getBalance(accountWallet.address) < amount) {
            const relayerWallet = new ethers.Wallet(relayerSigningKey.privateKey, ethers.provider);
            await (await relayerWallet.sendTransaction({ to: accountWallet.address, value: amount })).wait();
        }

        return {
            fallbackHandler,
            safeSingleton,
            safeCompatibilityFallbackHandler,
            deployer,
            clearStorageHelper,
            safeModuleSetup,
            safeEIP7702ProxyFactory,
            accountWallet,
            relayerSigningKey,
            safeLite,
            provider: ethers.provider
        };
    });

    describe("multisend", () => {
        it("Invoke multisend using relayer", async () => {
            const { accountWallet, safeLite, relayerSigningKey } =
                await setupTests();
            const provider = ethers.provider;
            const accountAddress = await accountWallet.getAddress();

            const chainId = (await provider.getNetwork()).chainId;
            const authNonce = BigInt(await accountWallet.getNonce());

            const authorizationList = getAuthorizationList(chainId, authNonce, accountWallet.privateKey, await safeLite.getAddress());

            const amount1 = BigInt("1");
            const amount2 = BigInt("2");
            const totalAmount = BigInt(amount1 + amount2);

            const transactions: MetaTransaction[] = [{
                to: ZeroAddress,
                value: amount1,
                data: "0x",
                operation: 0
            }, {
                to: ZeroAddress,
                value: amount2,
                data: "0x",
                operation: 0
            }];


            const encodedTx = encodeMultiSend(transactions);
            // Example usage
            const nonce: number = 0;

            const { r, vs } = await getSignature(provider, accountWallet, encodedTx, nonce, accountAddress);

            const calldata = safeLite.interface.encodeFunctionData("multiSend", [encodedTx, r, vs]);
            const encodedSignedTx = await getSignedTransaction(provider, relayerSigningKey, authorizationList, accountAddress, 0, calldata);

            const accountBalanceBefore = await provider.getBalance(accountAddress);

            const response = await provider.send("eth_sendRawTransaction", [encodedSignedTx]);
            const txReceipt = await (await provider.getTransaction(response))?.wait();
            const accountBalanceAfter = await provider.getBalance(accountAddress);
            expect(txReceipt?.status === 1, "Transaction failed");
            expect(accountBalanceAfter).to.equal(accountBalanceBefore - totalAmount);

            expect(await provider.getCode(accountAddress)).to.equal(ethers.concat(["0xef0100", await safeLite.getAddress()]));
            expect(BigInt(await provider.getStorage(accountAddress, getStorageSlot()))).to.equal(1n);

        })

        it("Invoke multisend (self sponsor)", async () => {
            const { accountWallet, safeLite } =
                await setupTests();
            const provider = ethers.provider;
            const accountAddress = await accountWallet.getAddress();

            const chainId = (await provider.getNetwork()).chainId;
            const authNonce = BigInt(await accountWallet.getNonce());

            const authorizationList = getAuthorizationList(chainId, authNonce, accountWallet.privateKey, await safeLite.getAddress());

            const amount1 = BigInt("1");
            const amount2 = BigInt("2");
            const totalAmount = BigInt(amount1 + amount2);

            const transactions: MetaTransaction[] = [{
                to: ZeroAddress,
                value: amount1,
                data: "0x",
                operation: 0
            }, {
                to: ZeroAddress,
                value: amount2,
                data: "0x",
                operation: 0
            }];

            const encodedTx = encodeMultiSend(transactions);
            // Example usage
            const nonce: number = 0;

            const { r, vs } = await getSignature(provider, accountWallet, encodedTx, nonce, accountAddress);

            const calldata = safeLite.interface.encodeFunctionData("multiSend", [encodedTx, r, vs]);
            const encodedSignedTx = await getSignedTransaction(provider, new SigningKey(accountWallet.privateKey), authorizationList, accountAddress, 0, calldata, nonce + 1);

            const accountBalanceBefore = await provider.getBalance(accountAddress);

            const response = await provider.send("eth_sendRawTransaction", [encodedSignedTx]);
            const txReceipt = await (await provider.getTransaction(response))?.wait();
            const accountBalanceAfter = await provider.getBalance(accountAddress);
            expect(txReceipt?.status === 1, "Transaction failed");
            expect(accountBalanceAfter).to.be.lessThan(accountBalanceBefore - totalAmount - BigInt(txReceipt?.gasUsed || 0));

            expect(await provider.getCode(accountAddress)).to.equal(ethers.concat(["0xef0100", await safeLite.getAddress()]));
            expect(BigInt(await provider.getStorage(accountAddress, getStorageSlot()))).to.equal(1);
        })
    });

    describe("isValidSignature", async () => {
        const setup = deployments.createFixture(async ({ deployments }) => {
            const { accountWallet, provider, safeLite, relayerSigningKey } = await setupTests();

            const chainId = (await provider.getNetwork()).chainId;
            const authNonce = BigInt(await accountWallet.getNonce());

            const authorizationList = getAuthorizationList(chainId, authNonce, accountWallet.privateKey, await safeLite.getAddress());
            const encodedSignedTx = await getSignedTransaction(provider, relayerSigningKey, authorizationList);
            const response = await provider.send("eth_sendRawTransaction", [encodedSignedTx]);
            await (await provider.getTransaction(response))?.wait();

            return {
                accountWallet
            }
        });

        it("Should magic value when signature is valid", async () => {
            const { accountWallet } =
                await setup();

            const safeLiteInstance = await getSafeLiteAtAddress(accountWallet.address);
            const hash = keccak256("0xdeadbeef");
            const signature = (accountWallet.signingKey).sign(ethers.toBeArray(hash));
            expect(await safeLiteInstance.isValidSignature.staticCall(hash, signature.compactSerialized)).to.equal("0x1626ba7e");
        });

        it("Should non-magic value when signature is valid", async () => {
            const { accountWallet } =
                await setup();

            const safeLiteInstance = await getSafeLiteAtAddress(accountWallet.address);
            const signerWallet = new ethers.Wallet(ethers.Wallet.createRandom().privateKey, ethers.provider);

            const hash = keccak256("0xdeadbeef");
            const signature = (signerWallet.signingKey).sign(ethers.toBeArray(hash));
            console.log(signature.compactSerialized, await safeLiteInstance.isValidSignature.staticCall(hash, signature.compactSerialized));
            expect(await safeLiteInstance.isValidSignature.staticCall(hash, signature.compactSerialized)).to.equal("0x00000000");

        });
    });

})