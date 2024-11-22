import { deployments, ethers } from "hardhat";
import {
    getIDAFallbackHandler,
    getCompatibilityFallbackHandler,
    getSafeAtAddress,
    getClearStorageHelper,
    getSafeModuleSetup,
    getSafeEIP7702Singleton,
} from "../src/utils/setup";
import { AddressLike, SigningKey, ZeroAddress } from "ethers";
import { execTransaction, getSetupDataForSingleton, GUARD_STORAGE_SLOT, readModuleStorageSlot, readOwnerStorageSlot } from "../src/utils/safe";
import { expect } from "chai";
import { getAuthorizationList, getSignedTransaction } from "../src/eip7702/helper";
import { FALLBACK_HANDLER_STORAGE_SLOT, SENTINEL_ADDRESS } from "../src/utils/safe";
import { isAccountDelegatedToAddress } from "../src/eip7702/storage";

describe("SafeEIP7702", () => {
    const setupTests = deployments.createFixture(async ({ deployments }) => {
        await deployments.fixture();
        const [deployer] = await ethers.getSigners();
        const fallbackHandler = await getIDAFallbackHandler();
        const safeEIP7702Singleton = await getSafeEIP7702Singleton();
        const safeCompatibilityFallbackHandler = await getCompatibilityFallbackHandler();
        const clearStorageHelper = await getClearStorageHelper();
        const safeModuleSetup = await getSafeModuleSetup();
        const delegatorSigningKey = new ethers.Wallet(ethers.Wallet.createRandom().privateKey, ethers.provider);
        const delegator = delegatorSigningKey.connect(ethers.provider);

        const pkRelayer = process.env.PK2 || "";
        const relayerSigningKey = new SigningKey(pkRelayer);

        return {
            fallbackHandler,
            safeEIP7702Singleton,
            safeCompatibilityFallbackHandler,
            deployer,
            delegator,
            clearStorageHelper,
            safeModuleSetup,
            delegatorSigningKey,
            relayerSigningKey
        };
    });

    const assertEmptyAccountStorage = async (account: AddressLike) => {
        const provider = ethers.provider;
        expect(await provider.getStorage(account, FALLBACK_HANDLER_STORAGE_SLOT)).to.equal(ethers.ZeroHash);
        expect(await provider.getStorage(account, GUARD_STORAGE_SLOT)).to.equal(ethers.ZeroHash);

        // Singleton address
        expect(await provider.getStorage(account, 0)).to.equal(ethers.ZeroHash);
        // Owner count
        expect(await provider.getStorage(account, 3)).to.equal(ethers.ZeroHash);
        // Threshold
        expect(await provider.getStorage(account, 4)).to.equal(ethers.ZeroHash);

        expect(await readModuleStorageSlot(provider, account, SENTINEL_ADDRESS)).to.equal(ethers.ZeroHash);
        expect(await readOwnerStorageSlot(provider, account, SENTINEL_ADDRESS)).to.equal(ethers.ZeroHash);
    };

    describe("Test SafeEIP7702", function () {
        it("Give authority to SafeEIP7702 Singleton with EOA address itself as Safe owner", async () => {
            const { fallbackHandler, deployer, relayerSigningKey, delegator, safeModuleSetup, delegatorSigningKey, safeEIP7702Singleton } =
                await setupTests();
            const provider = ethers.provider;
            const relayer = new ethers.Wallet(relayerSigningKey.privateKey, provider);

            const chainId = (await provider.getNetwork()).chainId;
            const authNonce = BigInt(await delegatorSigningKey.getNonce());

            // Deploy SafeProxy with the delegator as owner
            const owners = [delegator];
            const ownerAddresses = await Promise.all(owners.map(async (owner): Promise<string> => await owner.getAddress()));
            const fallbackHandlerAddress = await fallbackHandler.getAddress();

            const data = await getSetupDataForSingleton(
                delegator,
                await safeModuleSetup.getAddress(),
                [fallbackHandlerAddress],
                fallbackHandlerAddress,
            );

            const safeEIP7702SingletonAddress = await safeEIP7702Singleton.getAddress();

            const authorizationList = getAuthorizationList(chainId, authNonce, delegatorSigningKey.privateKey, safeEIP7702SingletonAddress);
            const encodedSignedTx = await getSignedTransaction(provider, relayerSigningKey, authorizationList);

            const account = await delegator.getAddress();

            const isAlreadyDelegated = await isAccountDelegatedToAddress(provider, await delegator.getAddress(), safeEIP7702SingletonAddress);
            expect(isAlreadyDelegated && (await provider.getStorage(account, 4)) == ethers.zeroPadValue("0x01", 32)).to.be.false;

            const response = await provider.send("eth_sendRawTransaction", [encodedSignedTx]);

            const txReceipt = await (await provider.getTransaction(response))?.wait();

            expect(txReceipt?.status === 1, "Transaction failed");

            expect(await isAccountDelegatedToAddress(provider, await delegator.getAddress(), safeEIP7702SingletonAddress)).to.be.true;


            const setupTxResponse = await relayer.sendTransaction({ to: await delegator.getAddress(), data: data });
            const txSetupReceipt = await setupTxResponse.wait();
            expect(txSetupReceipt?.status === 1, "Transaction failed");

            // const account = await delegator.getAddress();
            expect(await provider.getStorage(account, FALLBACK_HANDLER_STORAGE_SLOT)).to.equal(
                ethers.zeroPadValue(fallbackHandlerAddress, 32),
            );
            expect(await provider.getStorage(account, GUARD_STORAGE_SLOT)).to.equal(ethers.ZeroHash);
            // Singleton address
            expect(await provider.getStorage(account, 0)).to.equal(ethers.zeroPadValue(ZeroAddress, 32));
            // Owner count
            expect(await provider.getStorage(account, 3)).to.equal(ethers.zeroPadValue("0x01", 32));
            // Threshold
            expect(await provider.getStorage(account, 4)).to.equal(ethers.zeroPadValue("0x01", 32));
            expect(await readModuleStorageSlot(provider, account, SENTINEL_ADDRESS)).to.equal(
                ethers.zeroPadValue(fallbackHandlerAddress, 32),
            );
            expect(await readOwnerStorageSlot(provider, account, SENTINEL_ADDRESS)).to.equal(ethers.zeroPadValue(ownerAddresses[0], 32));

            const amount = 1n;
            if ((await provider.getBalance(account)) < amount) {
                const tx = await relayer.sendTransaction({
                    to: account,
                    value: amount,
                });
                await tx.wait();
            }
            const tx = await execTransaction(relayer, owners, await getSafeAtAddress(account), await deployer.getAddress(), "1", "0x", "0");
            await tx.wait();
        });

    });
});
