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
import { AddressLike, SigningKey } from "ethers";
import { execTransaction, getSetupData, GUARD_STORAGE_SLOT, readModuleStorageSlot, readOwnerStorageSlot } from "../src/utils/safe";
import { expect } from "chai";
import { ACCOUNT_CODE_PREFIX, calculateProxyAddress, getAuthorizationList, getSignedTransaction } from "../src/eip7702/helper";
import { FALLBACK_HANDLER_STORAGE_SLOT, SENTINEL_ADDRESS } from "../src/utils/safe";
import { SafeEIP7702ProxyFactory } from "../typechain-types";
import { isAccountDelegatedToAddress } from "../src/eip7702/storage";

describe("EIP7702", () => {
    const setupTests = deployments.createFixture(async ({ deployments }) => {
        await deployments.fixture();
        const [deployer, relayer, delegator] = await (ethers as any).getSigners();
        const fallbackHandler = await getIDAFallbackHandler();
        const safeSingleton = await getSafeSingleton();
        const safeCompatibilityFallbackHandler = await getCompatibilityFallbackHandler();
        const clearStorageHelper = await getClearStorageHelper();
        const safeModuleSetup = await getSafeModuleSetup();
        const safeEIP7702ProxyFactory: SafeEIP7702ProxyFactory = await getSafeEIP7702ProxyFactory();
        return {
            fallbackHandler,
            safeSingleton,
            safeCompatibilityFallbackHandler,
            deployer,
            relayer,
            delegator,
            clearStorageHelper,
            safeModuleSetup,
            safeEIP7702ProxyFactory,
        };
    });

    const assertEmptyAccountStorage = async (account: AddressLike) => {
        const provider = (ethers as any).provider;
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
        it("Give authority to SafeEIP7702Proxy", async () => {
            const { safeSingleton, fallbackHandler, relayer, deployer, delegator, safeModuleSetup, safeEIP7702ProxyFactory } =
                await setupTests();
            const pkDelegator = process.env.PK3 || "";
            const pkRelayer = process.env.PK2 || "";
            const provider = (ethers as any).provider;

            const delegatorSigningKey = new ethers.Wallet(pkDelegator, provider);
            const relayerSigningKey = new SigningKey(pkRelayer);

            const chainId = (await provider.getNetwork()).chainId;
            const authNonce = BigInt(await delegatorSigningKey.getNonce());

            // Deploy SafeProxy with the delegator as owner
            const owners = [await deployer.getAddress()];
            const fallbackHandlerAddress = await fallbackHandler.getAddress();
            const data = getSetupData(owners, 1, await safeModuleSetup.getAddress(), [fallbackHandlerAddress], fallbackHandlerAddress);

            const proxyAddress = await calculateProxyAddress(safeEIP7702ProxyFactory, await safeSingleton.getAddress(), data, 0);
            const isContract = (await provider.getCode(proxyAddress)) === "0x" ? false : true;

            if (!isContract) {
                console.log("Deploying Proxy");
                await safeEIP7702ProxyFactory.connect(deployer).createProxyWithNonce(await safeSingleton.getAddress(), data, 0);
            } else {
                console.log("Proxy already deployed: ", proxyAddress);
            }

            const authAddress = proxyAddress;

            const authorizationList = getAuthorizationList(chainId, authNonce, pkDelegator, authAddress);
            const encodedSignedTx = await getSignedTransaction(provider, relayerSigningKey, authorizationList);

            const account = await delegator.getAddress();

            const isAlreadyDelegated = await isAccountDelegatedToAddress(provider, await delegator.getAddress(), authAddress);
            if (isAlreadyDelegated && (await provider.getStorage(account, 4)) == ethers.zeroPadValue("0x01", 32)) {
                console.log("Account already delegated to Safe Proxy and storage is setup. Returning");
                return;
            }

            const response = await provider.send("eth_sendRawTransaction", [encodedSignedTx]);
            console.log("Set Auth transaction hash", response);

            console.log("Waiting for transaction confirmation");
            const txReceipt = await (await provider.getTransaction(response))?.wait();

            expect(txReceipt?.status === 1, "Transaction failed");

            console.log(await delegator.getAddress(), authAddress);
            console.log(await provider.getCode(account));
            expect(await isAccountDelegatedToAddress(provider, await delegator.getAddress(), authAddress)).to.be.true;

            console.log("Account successfully delegated to Safe Proxy");

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
            expect(await readOwnerStorageSlot(provider, account, SENTINEL_ADDRESS)).to.equal(ethers.zeroPadValue(owners[0], 32));

            const tx = await execTransaction(
                relayer,
                [deployer],
                await getSafeAtAddress(account),
                await deployer.getAddress(),
                "1",
                "0x",
                "0",
            );
            console.log("Transfer value txHash", (await tx.wait())?.hash);
        });

        it("Revoke authority and clear storage", async () => {
            const { relayer, delegator, clearStorageHelper } = await setupTests();
            const provider = (ethers as any).provider;
            const pkDelegator = process.env.PK3 || "";
            const pkRelayer = process.env.PK2 || "";

            const delegatorSigningKey = new ethers.Wallet(pkDelegator, provider);
            const relayerSigningKey = new SigningKey(pkRelayer);

            const chainId = (await provider.getNetwork()).chainId;
            const authNonce = BigInt(await delegatorSigningKey.getNonce());
            const authAddress = await clearStorageHelper.getAddress();

            const authorizationList = getAuthorizationList(chainId, authNonce, pkDelegator, authAddress);
            let encodedSignedTx = await getSignedTransaction(provider, relayerSigningKey, authorizationList);

            const response = await provider.send("eth_sendRawTransaction", [encodedSignedTx]);
            console.log("Transaction hash", response);
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
            const { safeSingleton, fallbackHandler, relayer, deployer, delegator, safeModuleSetup, safeEIP7702ProxyFactory } =
                await setupTests();
            const pkDelegator = process.env.PK3 || "";
            const pkRelayer = process.env.PK2 || "";
            const provider = (ethers as any).provider;

            const delegatorWallet = new ethers.Wallet(pkDelegator, provider);
            const relayerSigningKey = new SigningKey(pkRelayer);

            const account = await delegatorWallet.getAddress();
            expect(account).to.equal(await delegator.getAddress());

            const chainId = (await provider.getNetwork()).chainId;
            const authNonce = BigInt(await delegatorWallet.getNonce());

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

            const authorizationList = getAuthorizationList(chainId, authNonce, pkDelegator, proxyAddress);
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
