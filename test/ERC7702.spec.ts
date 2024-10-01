import { deployments, ethers } from "hardhat";
import hre from "hardhat";
import {
    getSafeSingleton,
    getIDAFallbackHandler,
    getSafeERC7702ProxyFactory,
    getCompatibilityFallbackHandler,
    getSafeAtAddress,
    getClearStorageHelper,
    getSafeModuleSetup,
} from "./utils/setup";
import { AddressLike, SigningKey } from "ethers";
import { execTransaction, getSetupData, GUARD_STORAGE_SLOT, readModuleStorageSlot, readOwnerStorageSlot } from "../src/utils/safe";
import { expect } from "chai";
import { ACCOUNT_CODE_PREFIX, calculateProxyAddress, getAuthorizationList, getSignedTransaction } from "../src/erc7702/helper";
import { FALLBACK_HANDLER_STORAGE_SLOT, SENTINEL_ADDRESS } from "../src/utils/safe";
import { SafeERC7702ProxyFactory } from "../typechain-types";
import { isAccountDelegatedToAddress } from "../src/erc7702/storage";

describe("ERC7702", () => {
    const setupTests = deployments.createFixture(async ({ deployments }) => {
        await deployments.fixture();
        const [deployer, relayer, delegator] = await ethers.getSigners();
        const fallbackHandler = await getIDAFallbackHandler();
        const safeSingleton = await getSafeSingleton();
        const safeCompatibilityFallbackHandler = await getCompatibilityFallbackHandler();
        const clearStorageHelper = await getClearStorageHelper();
        const safeModuleSetup = await getSafeModuleSetup();
        const safeERC7702ProxyFactory: SafeERC7702ProxyFactory = await getSafeERC7702ProxyFactory();
        return {
            fallbackHandler,
            safeSingleton,
            safeCompatibilityFallbackHandler,
            deployer,
            relayer,
            delegator,
            clearStorageHelper,
            safeModuleSetup,
            safeERC7702ProxyFactory,
        };
    });

    const assertEmptyAccountStorage = async (account: AddressLike) => {
        expect(await ethers.provider.getStorage(account, FALLBACK_HANDLER_STORAGE_SLOT)).to.equal(ethers.ZeroHash);
        expect(await ethers.provider.getStorage(account, GUARD_STORAGE_SLOT)).to.equal(ethers.ZeroHash);

        // Singleton address
        expect(await ethers.provider.getStorage(account, 0)).to.equal(ethers.ZeroHash);
        // Owner count
        expect(await ethers.provider.getStorage(account, 3)).to.equal(ethers.ZeroHash);
        // Threshold
        expect(await ethers.provider.getStorage(account, 4)).to.equal(ethers.ZeroHash);

        expect(await readModuleStorageSlot(ethers.provider, account, SENTINEL_ADDRESS)).to.equal(ethers.ZeroHash);
        expect(await readOwnerStorageSlot(ethers.provider, account, SENTINEL_ADDRESS)).to.equal(ethers.ZeroHash);
    };

    describe("Test SafeERC7702Proxy", function () {
        it("Give authority to SafeERC7702Proxy", async () => {
            const { safeSingleton, fallbackHandler, relayer, deployer, delegator, safeModuleSetup, safeERC7702ProxyFactory } =
                await setupTests();
            const pkDelegator = process.env.PK3 || "";
            const pkRelayer = process.env.PK2 || "";

            const delegatorSigningKey = new ethers.Wallet(pkDelegator, hre.ethers.provider);
            const relayerSigningKey = new SigningKey(pkRelayer);

            const chainId = (await ethers.provider.getNetwork()).chainId;
            const authNonce = BigInt(await delegatorSigningKey.getNonce());

            // Deploy SafeProxy
            const owners = [await deployer.getAddress()];
            const fallbackHandlerAddress = await fallbackHandler.getAddress();
            const data = getSetupData(owners, 1, await safeModuleSetup.getAddress(), [fallbackHandlerAddress], fallbackHandlerAddress);

            const proxyAddress = await calculateProxyAddress(safeERC7702ProxyFactory, await safeSingleton.getAddress(), data, 0);
            const isContract = (await ethers.provider.getCode(proxyAddress)) === "0x" ? false : true;

            if (!isContract) {
                console.log("Deploying Proxy");
                await safeERC7702ProxyFactory.connect(deployer).createProxyWithNonce(await safeSingleton.getAddress(), data, 0);
            } else {
                console.log("Proxy already deployed");
            }

            const authAddress = proxyAddress;

            const authorizationList = getAuthorizationList(chainId, authNonce, pkDelegator, authAddress);
            const encodedSignedTx = await getSignedTransaction(ethers.provider, relayerSigningKey, authorizationList);

            const isAlreadyDelegated = await isAccountDelegatedToAddress(ethers.provider, await delegator.getAddress(), authAddress);
            if (isAlreadyDelegated) {
                console.log("Account already delegated to Safe Proxy. Returning");
                return;
            }

            const response = await ethers.provider.send("eth_sendRawTransaction", [encodedSignedTx]);
            console.log("Set Auth transaction hash", response);

            console.log("Waiting for transaction confirmation");
            const txReceipt = await (await ethers.provider.getTransaction(response))?.wait();

            expect(txReceipt?.status === 1, "Transaction failed");
            expect(await isAccountDelegatedToAddress(ethers.provider, await delegator.getAddress(), authAddress)).to.be.true;

            console.log("Account successfully delegated to Safe Proxy");

            const setupTxResponse = await relayer.sendTransaction({ to: await delegator.getAddress(), data: data });
            const txSetupReceipt = await setupTxResponse.wait();
            expect(txSetupReceipt?.status === 1, "Transaction failed");

            const account = await delegator.getAddress();
            console.log("ethers.zeroPadValue(fallbackHandlerAddress, 32): ", ethers.zeroPadValue(fallbackHandlerAddress, 32));
            expect(await ethers.provider.getStorage(account, FALLBACK_HANDLER_STORAGE_SLOT)).to.equal(
                ethers.zeroPadValue(fallbackHandlerAddress, 32),
            );
            expect(await ethers.provider.getStorage(account, GUARD_STORAGE_SLOT)).to.equal(ethers.ZeroHash);
            // Singleton address
            expect(await ethers.provider.getStorage(account, 0)).to.equal(ethers.zeroPadValue(await safeSingleton.getAddress(), 32));
            // Owner count
            expect(await ethers.provider.getStorage(account, 3)).to.equal(ethers.zeroPadValue("0x01", 32));
            // Threshold
            expect(await ethers.provider.getStorage(account, 4)).to.equal(ethers.zeroPadValue("0x01", 32));
            expect(await readModuleStorageSlot(ethers.provider, account, SENTINEL_ADDRESS)).to.equal(
                ethers.zeroPadValue(fallbackHandlerAddress, 32),
            );
            expect(await readOwnerStorageSlot(ethers.provider, account, SENTINEL_ADDRESS)).to.equal(ethers.zeroPadValue(owners[0], 32));
        });

        it("Revoke authority and clear storage", async () => {
            const { relayer, delegator, clearStorageHelper } = await setupTests();

            const pkDelegator = process.env.PK3 || "";
            const pkRelayer = process.env.PK2 || "";

            const delegatorSigningKey = new ethers.Wallet(pkDelegator, hre.ethers.provider);
            const relayerSigningKey = new SigningKey(pkRelayer);

            const chainId = (await ethers.provider.getNetwork()).chainId;
            const authNonce = BigInt(await delegatorSigningKey.getNonce());
            const authAddress = await clearStorageHelper.getAddress();

            const authorizationList = getAuthorizationList(chainId, authNonce, pkDelegator, authAddress);
            let encodedSignedTx = await getSignedTransaction(ethers.provider, relayerSigningKey, authorizationList);

            const response = await ethers.provider.send("eth_sendRawTransaction", [encodedSignedTx]);
            console.log("Transaction hash", response);
            const txReceipt = await (await ethers.provider.getTransaction(response))?.wait();
            expect(txReceipt?.status === 1, "Transaction failed");

            const codeAtEOA = await ethers.provider.getCode(await delegator.getAddress());
            expect(codeAtEOA).to.equal(ethers.concat([ACCOUNT_CODE_PREFIX, await clearStorageHelper.getAddress()]));

            const clearAccountStorage = await ethers.getContractAt("ClearStorageHelper", await delegator.getAddress());
            const txClearStorageResponse = await clearAccountStorage.connect(relayer).clearSafeStorage();
            await txClearStorageResponse.wait();

            const account = await delegator.getAddress();
            await assertEmptyAccountStorage(account);
        });

        it("Clear storage using onRedelegation()", async () => {
            const { safeSingleton, fallbackHandler, relayer, deployer, delegator, safeModuleSetup, safeERC7702ProxyFactory } =
                await setupTests();
            const pkDelegator = process.env.PK3 || "";
            const pkRelayer = process.env.PK2 || "";

            const delegatorWallet = new ethers.Wallet(pkDelegator, hre.ethers.provider);
            const relayerSigningKey = new SigningKey(pkRelayer);

            const account = await delegatorWallet.getAddress();
            expect(account).to.equal(await delegator.getAddress());

            const chainId = (await ethers.provider.getNetwork()).chainId;
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

            const proxyAddress = await calculateProxyAddress(safeERC7702ProxyFactory, await safeSingleton.getAddress(), setupData, 0);
            const isContract = (await ethers.provider.getCode(proxyAddress)) === "0x" ? false : true;

            if (!isContract) {
                await safeERC7702ProxyFactory.connect(deployer).createProxyWithNonce(await safeSingleton.getAddress(), setupData, 0);
            }

            const authorizationList = getAuthorizationList(chainId, authNonce, pkDelegator, proxyAddress);
            const encodedSignedTx = await getSignedTransaction(ethers.provider, relayerSigningKey, authorizationList);

            const response = await ethers.provider.send("eth_sendRawTransaction", [encodedSignedTx]);
            const txSetupDataReceipt = await (await ethers.provider.getTransaction(response))?.wait();
            expect(txSetupDataReceipt?.status === 1, "Transaction failed");
            const setupTxResponse = await relayer.sendTransaction({ to: account, data: setupData });
            const txSetupReceipt = await setupTxResponse.wait();
            expect(txSetupReceipt?.status === 1, "Transaction failed");

            const safe = await getSafeAtAddress(account);
            const data = fallbackHandler.interface.encodeFunctionData("onRedelegation", []);
            const txResponse = await execTransaction(relayer, owners, safe, account, "0", data, "0");
            const txReceipt = await txResponse.wait();
            expect(txReceipt !== null && txReceipt.status === 1, "Transaction failed");

            await assertEmptyAccountStorage(account);
        });
    });
});
