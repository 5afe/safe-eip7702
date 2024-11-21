import { deployments, ethers } from "hardhat";
import {
    getSafeSingleton,
    getIDAFallbackHandler,
    getSafeEIP7702ProxyFactory,
    getCompatibilityFallbackHandler,
    getSafeAtAddress,
    getClearStorageHelper,
    getSafeModuleSetup,
} from "../src/utils/setup";
import { AddressLike, SigningKey, ZeroAddress } from "ethers";
import { execTransaction, getSetupData, GUARD_STORAGE_SLOT, readModuleStorageSlot, readOwnerStorageSlot } from "../src/utils/safe";
import { expect } from "chai";
import { ACCOUNT_CODE_PREFIX, calculateProxyAddress, getAuthorizationList, getSignedTransaction } from "../src/eip7702/helper";
import { FALLBACK_HANDLER_STORAGE_SLOT, SENTINEL_ADDRESS } from "../src/utils/safe";
import { SafeEIP7702ProxyFactory } from "../typechain-types";
import { isAccountDelegatedToAddress } from "../src/eip7702/storage";

describe("EIP7702", () => {
    const setupTests = deployments.createFixture(async ({ deployments }) => {
        await deployments.fixture();
        const [deployer] = await ethers.getSigners();
        const fallbackHandler = await getIDAFallbackHandler();
        const safeSingleton = await getSafeSingleton();
        const safeCompatibilityFallbackHandler = await getCompatibilityFallbackHandler();
        const clearStorageHelper = await getClearStorageHelper();
        const safeModuleSetup = await getSafeModuleSetup();
        const safeEIP7702ProxyFactory: SafeEIP7702ProxyFactory = await getSafeEIP7702ProxyFactory();
        const delegatorSigningKey = new ethers.Wallet(ethers.Wallet.createRandom().privateKey, ethers.provider);
        const delegator = delegatorSigningKey.connect(ethers.provider);

        const pkRelayer = process.env.PK2 || "";
        const relayerSigningKey = new SigningKey(pkRelayer);

        return {
            fallbackHandler,
            safeSingleton,
            safeCompatibilityFallbackHandler,
            deployer,
            delegator,
            clearStorageHelper,
            safeModuleSetup,
            safeEIP7702ProxyFactory,
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

    describe("Test SafeEIP7702Proxy", function () {
        it("Give authority to SafeEIP7702Proxy with EOA address itself as Safe owner", async () => {
            const { safeSingleton, fallbackHandler, deployer, relayerSigningKey, delegator, safeModuleSetup, safeEIP7702ProxyFactory, delegatorSigningKey } =
                await setupTests();
            const provider = ethers.provider;
            const relayer = new ethers.Wallet(relayerSigningKey.privateKey, provider);

            const chainId = (await provider.getNetwork()).chainId;
            const authNonce = BigInt(await delegatorSigningKey.getNonce());

            // Deploy SafeProxy with the delegator as owner
            const owners = [delegator];
            const ownerAddresses = await Promise.all(owners.map(async (owner): Promise<string> => await owner.getAddress()));
            const fallbackHandlerAddress = await fallbackHandler.getAddress();
            const data = getSetupData(
                ownerAddresses,
                1,
                await safeModuleSetup.getAddress(),
                [fallbackHandlerAddress],
                fallbackHandlerAddress,
            );

            const proxyAddress = await calculateProxyAddress(safeEIP7702ProxyFactory, await safeSingleton.getAddress(), data, 0);
            const isContract = (await provider.getCode(proxyAddress)) === "0x" ? false : true;

            if (!isContract) {
                await safeEIP7702ProxyFactory.connect(deployer).createProxyWithNonce(await safeSingleton.getAddress(), data, 0);
            }

            const authorizationList = getAuthorizationList(chainId, authNonce, delegatorSigningKey.privateKey, proxyAddress);
            const encodedSignedTx = await getSignedTransaction(provider, relayerSigningKey, authorizationList);

            const account = await delegator.getAddress();

            const isAlreadyDelegated = await isAccountDelegatedToAddress(provider, await delegator.getAddress(), proxyAddress);
            expect(isAlreadyDelegated && (await provider.getStorage(account, 4)) == ethers.zeroPadValue("0x01", 32)).to.be.false;

            const response = await provider.send("eth_sendRawTransaction", [encodedSignedTx]);

            const txReceipt = await (await provider.getTransaction(response))?.wait();

            expect(txReceipt?.status === 1, "Transaction failed");

            expect(await isAccountDelegatedToAddress(provider, await delegator.getAddress(), proxyAddress)).to.be.true;


            const setupTxResponse = await relayer.sendTransaction({ to: await delegator.getAddress(), data: data });
            const txSetupReceipt = await setupTxResponse.wait();
            expect(txSetupReceipt?.status === 1, "Transaction failed");

            // const account = await delegator.getAddress();
            expect(await provider.getStorage(account, FALLBACK_HANDLER_STORAGE_SLOT)).to.equal(
                ethers.zeroPadValue(fallbackHandlerAddress, 32),
            );
            expect(await provider.getStorage(account, GUARD_STORAGE_SLOT)).to.equal(ethers.ZeroHash);
            // Singleton address
            expect(await provider.getStorage(account, 0)).to.equal(ethers.zeroPadValue(await safeSingleton.getAddress(), 32));
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

        it("Give authority to SafeEIP7702Proxy with other address as Safe owner", async () => {
            const { safeSingleton, fallbackHandler, deployer, relayerSigningKey, delegator, safeModuleSetup, safeEIP7702ProxyFactory, delegatorSigningKey } =
                await setupTests();
            const provider = ethers.provider;
            const relayer = new ethers.Wallet(relayerSigningKey.privateKey, provider);

            const chainId = (await provider.getNetwork()).chainId;
            const authNonce = BigInt(await delegatorSigningKey.getNonce());

            // Deploy SafeProxy with the another address as owner
            const safeOwner = new ethers.Wallet(ethers.Wallet.createRandom().privateKey, ethers.provider);

            const owners = [safeOwner];
            const ownerAddresses = await Promise.all(owners.map(async (owner): Promise<string> => await owner.getAddress()));
            const fallbackHandlerAddress = await fallbackHandler.getAddress();
            const data = getSetupData(
                ownerAddresses,
                1,
                await safeModuleSetup.getAddress(),
                [fallbackHandlerAddress],
                fallbackHandlerAddress,
            );

            const proxyAddress = await calculateProxyAddress(safeEIP7702ProxyFactory, await safeSingleton.getAddress(), data, 0);
            const isContract = (await provider.getCode(proxyAddress)) === "0x" ? false : true;

            if (!isContract) {
                await safeEIP7702ProxyFactory.connect(deployer).createProxyWithNonce(await safeSingleton.getAddress(), data, 0);
            }

            const authorizationList = getAuthorizationList(chainId, authNonce, delegatorSigningKey.privateKey, proxyAddress);
            const encodedSignedTx = await getSignedTransaction(provider, relayerSigningKey, authorizationList);

            const account = await delegator.getAddress();

            const isAlreadyDelegated = await isAccountDelegatedToAddress(provider, await delegator.getAddress(), proxyAddress);
            expect(isAlreadyDelegated && (await provider.getStorage(account, 4)) == ethers.zeroPadValue("0x01", 32)).to.be.false;

            const response = await provider.send("eth_sendRawTransaction", [encodedSignedTx]);

            const txReceipt = await (await provider.getTransaction(response))?.wait();

            expect(txReceipt?.status === 1, "Transaction failed");

            expect(await isAccountDelegatedToAddress(provider, await delegator.getAddress(), proxyAddress)).to.be.true;


            const setupTxResponse = await relayer.sendTransaction({ to: await delegator.getAddress(), data: data });
            const txSetupReceipt = await setupTxResponse.wait();
            expect(txSetupReceipt?.status === 1, "Transaction failed");

            // const account = await delegator.getAddress();
            expect(await provider.getStorage(account, FALLBACK_HANDLER_STORAGE_SLOT)).to.equal(
                ethers.zeroPadValue(fallbackHandlerAddress, 32),
            );
            expect(await provider.getStorage(account, GUARD_STORAGE_SLOT)).to.equal(ethers.ZeroHash);
            // Singleton address
            expect(await provider.getStorage(account, 0)).to.equal(ethers.zeroPadValue(await safeSingleton.getAddress(), 32));
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

        it("Revoke authority and clear storage", async () => {
            const { delegator, clearStorageHelper, relayerSigningKey } = await setupTests();
            const provider = ethers.provider;
            const relayer = new ethers.Wallet(relayerSigningKey.privateKey, provider);

            const chainId = (await provider.getNetwork()).chainId;
            const authNonce = BigInt(await delegator.getNonce());
            const authAddress = await clearStorageHelper.getAddress();

            const authorizationList = getAuthorizationList(chainId, authNonce, delegator.privateKey, authAddress);
            let encodedSignedTx = await getSignedTransaction(provider, relayerSigningKey, authorizationList);

            const response = await provider.send("eth_sendRawTransaction", [encodedSignedTx]);
            const txReceipt = await (await provider.getTransaction(response))?.wait();
            expect(txReceipt?.status === 1, "Transaction failed");

            const codeAtEOA = await provider.getCode(await delegator.getAddress());
            expect(codeAtEOA).to.equal(ethers.concat([ACCOUNT_CODE_PREFIX, await clearStorageHelper.getAddress()]));

            const clearAccountStorage = await ethers.getContractAt("ClearStorageHelper", await delegator.getAddress());
            const txClearStorageResponse = await clearAccountStorage.connect(relayer).clearSafeStorage();
            await txClearStorageResponse.wait();

            const account = await delegator.getAddress();
            await assertEmptyAccountStorage(account);
        });

        it("Clear storage using onRedelegation()", async () => {
            const { safeSingleton, fallbackHandler, deployer, delegator, safeModuleSetup, safeEIP7702ProxyFactory, relayerSigningKey } =
                await setupTests();

            const provider = ethers.provider;
            const relayer = new ethers.Wallet(relayerSigningKey.privateKey, provider);

            const account = await delegator.getAddress();
            expect(account).to.equal(await delegator.getAddress());

            const chainId = (await provider.getNetwork()).chainId;
            const authNonce = BigInt(await delegator.getNonce());

            // Deploy SafeProxy
            const owners = [deployer];
            const ownerAddresses = await Promise.all(owners.map(async (owner): Promise<string> => await owner.getAddress()));
            const fallbackHandlerAddress = await fallbackHandler.getAddress();
            const setupData = getSetupData(
                ownerAddresses,
                1,
                await safeModuleSetup.getAddress(),
                [fallbackHandlerAddress],
                fallbackHandlerAddress,
            );

            const proxyAddress = await calculateProxyAddress(safeEIP7702ProxyFactory, await safeSingleton.getAddress(), setupData, 0);
            const isContract = (await provider.getCode(proxyAddress)) === "0x" ? false : true;

            if (!isContract) {
                await safeEIP7702ProxyFactory.connect(deployer).createProxyWithNonce(await safeSingleton.getAddress(), setupData, 0);
            }

            const authorizationList = getAuthorizationList(chainId, authNonce, delegator.privateKey, proxyAddress);
            const encodedSignedTx = await getSignedTransaction(provider, relayerSigningKey, authorizationList);

            const response = await provider.send("eth_sendRawTransaction", [encodedSignedTx]);
            const txSetupDataReceipt = await (await provider.getTransaction(response))?.wait();
            expect(txSetupDataReceipt?.status === 1, "Transaction failed");
            const setupTxResponse = await relayer.sendTransaction({ to: account, data: setupData });
            const txSetupReceipt = await setupTxResponse.wait();
            expect(txSetupReceipt?.status === 1, "Transaction failed");

            const safe = await getSafeAtAddress(account);
            const interfaceOnRedelegation = new ethers.Interface(["function onRedelegation()"]);
            const data = interfaceOnRedelegation.encodeFunctionData("onRedelegation", []);
            const txResponse = await execTransaction(relayer, owners, safe, account, "0", data, "0");
            const txReceipt = await txResponse.wait();
            expect(txReceipt !== null && txReceipt.status === 1, "Transaction failed");

            await assertEmptyAccountStorage(account);
        });
    });
});
