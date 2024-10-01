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
import { AddressLike, Provider, SigningKey } from "ethers";
import { execTransaction, getSetupData, GUARD_STORAGE_SLOT, readModuleStorageSlot, readOwnerStorageSlot } from "../src/utils/safe";
import { expect } from "chai";
import { ACCOUNT_CODE_PREFIX, calculateProxyAddress, getAuthorizationList, getSignedTransaction } from "../src/erc7702/helper";
import { FALLBACK_HANDLER_STORAGE_SLOT, SENTINEL_ADDRESS } from "../src/utils/safe";
import { SafeERC7702ProxyFactory } from "../typechain-types";
import { readStorage } from "../src/utils/storageReader";
import { isAccountDelegatedToAddress } from "../src/erc7702/storage";

describe("FallbackHandler", () => {
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

    describe("Authorize Tx", function () {
        it.only("Give authority to Safe", async () => {
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
            if (isAlreadyDelegated) console.log("Account already delegated to Safe. Resubmitting authorization.");

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
            await printAccountStorage(ethers.provider, account, await safeSingleton.getAddress());
        });

        it.skip("Revoke authority to Safe and clear storage", async () => {
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

            console.log("Sending transaction to redelegate to ClearStorageHelper");
            const response = await ethers.provider.send("eth_sendRawTransaction", [encodedSignedTx]);
            console.log("Waiting for transaction confirmation");
            console.log("Transaction hash", response);
            const txReceipt = await (await ethers.provider.getTransaction(response))?.wait();
            expect(txReceipt?.status === 1, "Transaction failed");

            const codeAtEOA = await ethers.provider.getCode(await delegator.getAddress());
            expect(codeAtEOA).to.equal(ethers.concat([ACCOUNT_CODE_PREFIX, await clearStorageHelper.getAddress()]));

            console.log("Clearing Safe Account storage");
            const clearAccountStorage = await ethers.getContractAt("ClearStorageHelper", await delegator.getAddress());
            const txClearStorageResponse = await clearAccountStorage.connect(relayer).clearSafeStorage();
            await txClearStorageResponse.wait();

            const account = await delegator.getAddress();

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
        });

        it.skip("Update fallback handler", async () => {
            const { fallbackHandler, relayer, deployer, delegator } = await setupTests();
            const newOwners = [deployer];
            const safe = await getSafeAtAddress(await delegator.getAddress());
            const data = safe.interface.encodeFunctionData("setFallbackHandler", [await fallbackHandler.getAddress()]);
            const txResponse = await execTransaction(relayer, newOwners, safe, await safe.getAddress(), "0", data, "0");
            const txReceipt = await txResponse.wait();
            expect(txReceipt !== null && txReceipt.status === 1, "Transaction failed");
        });

        it.skip("Enable module", async () => {
            const { fallbackHandler, relayer, deployer, delegator } = await setupTests();
            const newOwners = [deployer];
            const safe = await getSafeAtAddress(await delegator.getAddress());

            expect(await safe.isModuleEnabled(await fallbackHandler.getAddress())).to.be.false;
            const data = safe.interface.encodeFunctionData("enableModule", [await fallbackHandler.getAddress()]);
            const txResponse = await execTransaction(relayer, newOwners, safe, await safe.getAddress(), "0", data, "0");
            const txReceipt = await txResponse.wait();
            expect(txReceipt !== null && txReceipt.status === 1, "Transaction failed");
            const log = txReceipt?.logs.find((log: any) => log.address === safe);
            expect(log && fallbackHandler.interface.parseLog(log)?.name === "EnabledModule");
        });

        it.skip("Get fallback handler", async () => {
            const { fallbackHandler, delegator } = await setupTests();
            const safe = await getSafeAtAddress(await delegator.getAddress());

            expect(await safe.getStorageAt(FALLBACK_HANDLER_STORAGE_SLOT, 1)).to.eq(
                "0x" + (await fallbackHandler.getAddress())?.slice(2).toLowerCase().padStart(64, "0"),
            );
        });

        it.skip("Clear Safe storage", async () => {
            const { fallbackHandler, relayer, deployer, delegator, safeSingleton } = await setupTests();
            const owners = [deployer];

            const safe = await getSafeAtAddress(await delegator.getAddress());
            const data = fallbackHandler.interface.encodeFunctionData("onRedelegation", []);
            const txResponse = await execTransaction(relayer, owners, safe, await safe.getAddress(), "0", data, "0");
            const txReceipt = await txResponse.wait();
            expect(txReceipt !== null && txReceipt.status === 1, "Transaction failed");

            const account = await delegator.getAddress();

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
        });
    });
});

const printAccountStorage = async (provider: Provider, account: AddressLike, safeSingleton: AddressLike | null) => {
    await readStorage(provider, account);
    console.log("account: ", account.toString());
    console.log("code: ", await provider.getCode(account));
    if (safeSingleton && (await provider.getCode(account)) === ethers.concat([ACCOUNT_CODE_PREFIX, safeSingleton.toString()])) {
        const safe = await getSafeAtAddress(account.toString());
        console.log("owners: ", await safe.getOwners());
        console.log("threshold: ", await safe.getThreshold());
        console.log("modules: ", await safe.getModulesPaginated("0x0000000000000000000000000000000000000001", 10));
    }

    console.log("module pointer at sentinel address: ", await readModuleStorageSlot(provider, account, SENTINEL_ADDRESS));
    console.log("owner pointer at sentinel address: ", await readOwnerStorageSlot(provider, account, SENTINEL_ADDRESS));
};
