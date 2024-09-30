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
import { serializeEip7702, encodeRLPAuthorizationEntryUnsigned } from "../src/utils/encodeRLP";
import { execTransaction } from "./utils/safe";
import { expect } from "chai";
import { calculateProxyAddress, getAuthorizationList } from "../src/erc7702/helper";
import { readModuleStorageSlot, readOwnerStorageSlot } from "../src/erc7702/storage";
import { SafeERC7702ProxyFactory } from "../typechain-types";

const FALLBACK_HANDLER_STORAGE_SLOT = "0x6c9a6c4a39284e37ed1cf53d337577d14212a4870fb976a4366c693b939918d5";
const GUARD_STORAGE_SLOT = "0x4a204f620c8c5ccdca3fd54d003badd85ba500436a431f0cbda4f558c93c34c8";
const SENTINEL_ADDRESS = "0x0000000000000000000000000000000000000001";

const readStorage = async (provider: Provider, account: AddressLike) => {
    console.log("---- fallback handler ----");
    console.log(await provider.getStorage(account, FALLBACK_HANDLER_STORAGE_SLOT));

    console.log("---- guard ----");
    console.log(await provider.getStorage(account, GUARD_STORAGE_SLOT));

    for (let i = 0; i <= 4; i++) {
        console.log(`---- slot ${i} ----`);
        console.log(await provider.getStorage(account, i));
    }
};

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
            safeERC7702ProxyFactory
        };
    });

    describe("Authorize Tx", function () {
        it.only("Give authority to Safe", async () => {
            const { safeSingleton, fallbackHandler, relayer, deployer, delegator, safeModuleSetup, safeERC7702ProxyFactory } = await setupTests();
            const pkDelegator = process.env.PK3 || "";
            const pkRelayer = process.env.PK2 || "";

            const delegatorSigningKey = new ethers.Wallet(pkDelegator, hre.ethers.provider);
            const relayerSigningKey = new SigningKey(pkRelayer);
            const relayerWallet = new ethers.Wallet(pkRelayer, hre.ethers.provider);

            const chainId = (await ethers.provider.getNetwork()).chainId;
            const authNonce = BigInt(await delegatorSigningKey.getNonce());

            // Deploy SafeProxy
            const newOwners = [await deployer.getAddress()];

            const data = safeSingleton.interface.encodeFunctionData("setup", [
                newOwners,
                1,
                safeModuleSetup.target,
                safeModuleSetup.interface.encodeFunctionData("enableModules", [[fallbackHandler.target]]),
                fallbackHandler.target,
                ethers.ZeroAddress,
                0,
                ethers.ZeroAddress,
            ]);

            const SETUP_DATA_HASH = ethers.keccak256(data);
            console.log("SETUP_DATA_HASH", SETUP_DATA_HASH);
            
            const proxyAddress = await calculateProxyAddress(safeERC7702ProxyFactory, await safeSingleton.getAddress(), data, 0);
            const isContract = (await ethers.provider.getCode(proxyAddress)) === "0x"? false: true;
            
            if(!isContract) {
                console.log("Deploying Proxy");
                const proxy = await safeERC7702ProxyFactory.connect(deployer).createProxyWithNonce(await safeSingleton.getAddress(), data, 0);
                expect(proxy).to.equal(proxyAddress);
            }

            const authAddress = proxyAddress;
            const authorizationList = getAuthorizationList(chainId, authNonce, pkDelegator, authAddress);

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

            const encodedTx = serializeEip7702(tx, null);
            const txHashToSign = ethers.keccak256(encodedTx);

            const signature = relayerSigningKey.sign(txHashToSign);

            const encodedSignedTx = serializeEip7702(tx, signature);
            const response = await ethers.provider.send("eth_sendRawTransaction", [encodedSignedTx]);
            console.log("Set Auth transaction hash", response);

            console.log("Waiting for transaction confirmation");
            const txReceipt = await (await ethers.provider.getTransaction(response))?.wait();
            expect(txReceipt?.status === 1, "Transaction failed");

            const codeAtEOA = await ethers.provider.getCode(await delegatorSigningKey.getAddress());
            expect(codeAtEOA).to.equal(ethers.concat(["0xef0100", authAddress]));

            const setupTxResponse = await relayer.sendTransaction({ to: await delegator.getAddress(), data: data });
            const txSetupReceipt = await setupTxResponse.wait();
            expect(txSetupReceipt?.status === 1, "Transaction failed");

            await printAccountStorage(ethers.provider, await delegator.getAddress(), proxyAddress);
        });

        it.skip("Revoke authority to Safe and clear storage", async () => {
            const { relayer, delegator, clearStorageHelper } = await setupTests();

            const pkDelegator = process.env.PK3 || "";
            const pkRelayer = process.env.PK2 || "";

            const delegatorSigningKey = new ethers.Wallet(pkDelegator, hre.ethers.provider);
            const relayerSigningKey = new SigningKey(pkRelayer);
            const relayerWallet = new ethers.Wallet(pkRelayer, hre.ethers.provider);

            const chainId = (await ethers.provider.getNetwork()).chainId;
            const authNonce = BigInt(await delegatorSigningKey.getNonce());
            const authAddress = await clearStorageHelper.getAddress();

            const authorizationList = getAuthorizationList(chainId, authNonce, pkDelegator, authAddress);

            let tx = {
                from: await relayerWallet.getAddress(),
                nonce: await relayerWallet.getNonce(),
                gasLimit: ethers.toBeHex(21000000),
                gasPrice: ethers.toBeHex(501),
                data: "0x",
                to: ethers.ZeroAddress,
                value: "0",
                chainId: (await ethers.provider.getNetwork()).chainId,
                type: 4,
                maxFeePerGas: ethers.toBeHex(30000),
                maxPriorityFeePerGas: ethers.toBeHex(30000),
                accessList: [],
                authorizationList: authorizationList,
            };

            const encodedTx = serializeEip7702(tx, null);
            const txHashToSign = ethers.keccak256(encodedTx);
            const signature = relayerSigningKey.sign(txHashToSign);

            const encodedSignedTx = serializeEip7702(tx, signature);
            console.log("Sending transaction to redelegate to ClearStorageHelper");
            const response = await ethers.provider.send("eth_sendRawTransaction", [encodedSignedTx]);
            console.log("Waiting for transaction confirmation");
            console.log("Transaction hash", response);
            const txReceipt = await (await ethers.provider.getTransaction(response))?.wait();
            expect(txReceipt?.status === 1, "Transaction failed");

            const codeAtEOA = await ethers.provider.getCode(await delegator.getAddress());
            expect(codeAtEOA).to.equal(ethers.concat(["0xef0100", await clearStorageHelper.getAddress()]));

            console.log("Clearing Safe Account storage");
            const clearAccountStorage = await ethers.getContractAt("ClearStorageHelper", await delegator.getAddress());
            const txClearStorageResponse = await clearAccountStorage.connect(relayer).clearSafeStorage();
            await txClearStorageResponse.wait();

            // expect(await ethers.provider.getStorage(await delegator.getAddress(), FALLBACK_HANDLER_STORAGE_SLOT)).to.equal(
            //     ethers.ZeroAddress,
            // );
            // expect(await ethers.provider.getStorage(await delegator.getAddress(), GUARD_STORAGE_SLOT)).to.equal(ethers.ZeroAddress);
            // expect(await ethers.provider.getStorage(await delegator.getAddress(), 0)).to.equal(ethers.ZeroAddress);
            // // Owner count
            // expect(await ethers.provider.getStorage(await delegator.getAddress(), 3)).to.equal(ethers.ZeroAddress);
            // // Threshold
            // expect(await ethers.provider.getStorage(await delegator.getAddress(), 4)).to.equal(ethers.ZeroAddress);

            await printAccountStorage(ethers.provider, await delegator.getAddress(), null);
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
            const fallbackHandlerAddress = await fallbackHandler.getAddress();
            const account = await delegator.getAddress();

            // const log = txReceipt?.logs.find((log: any) => log.address === fallbackHandlerAddress);
            // expect(log && fallbackHandler.interface.parseLog(log)?.name === "OnRedelegation");


            // expect(await ethers.provider.getStorage(account, FALLBACK_HANDLER_STORAGE_SLOT)).to.equal(
            //     ethers.ZeroHash,
            // );
            // expect(await ethers.provider.getStorage(account, GUARD_STORAGE_SLOT)).to.equal(ethers.ZeroHash);
            // expect(await ethers.provider.getStorage(account, 0)).to.equal(ethers.ZeroAddress);
            // // Owner count
            // expect(await ethers.provider.getStorage(account, 3)).to.equal(ethers.ZeroAddress);
            // // Threshold
            // expect(await ethers.provider.getStorage(account, 4)).to.equal(ethers.ZeroAddress);
            
            await printAccountStorage(ethers.provider, account, safeSingleton.target);
        });

    });
});

const printAccountStorage = async (provider: Provider, account: AddressLike, safeSingleton: AddressLike | null) => {
    await readStorage(ethers.provider, account);
    console.log("account: ", account.toString());
    console.log("code: ", await ethers.provider.getCode(account));
    if (safeSingleton && (await ethers.provider.getCode(account)) === ethers.concat(["0xef0100", safeSingleton.toString()])) {
        const safe = await getSafeAtAddress(account.toString());
        console.log("owners: ", await safe.getOwners());
        console.log("threshold: ", await safe.getThreshold());
        console.log("modules: ", await safe.getModulesPaginated("0x0000000000000000000000000000000000000001", 10));
    }

    console.log("module pointer at sentinel address: ", await readModuleStorageSlot(provider, account, SENTINEL_ADDRESS));
    console.log("owner pointer at sentinel address: ", await readOwnerStorageSlot(provider, account, SENTINEL_ADDRESS));
};
