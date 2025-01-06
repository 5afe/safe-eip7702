import dotenv from "dotenv";
dotenv.config();
import { deployments, ethers } from "hardhat";
import { isAccountDelegatedToAddress } from "../../eip7702/storage";
import { Provider, SigningKey } from "ethers";
import { printAccountStorage } from "../../utils/storageReader";
import { getSetupDataForSingleton } from "../../utils/safe";
import { getAuthorizationList, getSignedTransaction } from "../../eip7702/helper";
import {
    getClearStorageHelper,
    getCompatibilityFallbackHandler,
    getIDAFallbackHandler,
    getSafeModuleSetup,
    getSafeEIP7702Singleton,
} from "../../utils/setup";

const setup = async (provider: Provider) => {
    await deployments.fixture();

    const delegator = new ethers.Wallet(process.env.ACCOUNT_PRIVATE_KEY || "", provider);
    const relayer = new ethers.Wallet(process.env.RELAYER_PRIVATE_KEY || "", provider);

    const fallbackHandler = await getIDAFallbackHandler();
    const safeSingleton = await getSafeEIP7702Singleton();
    const safeCompatibilityFallbackHandler = await getCompatibilityFallbackHandler();
    const clearStorageHelper = await getClearStorageHelper();
    const safeModuleSetup = await getSafeModuleSetup();
    return {
        fallbackHandler,
        safeSingleton,
        safeCompatibilityFallbackHandler,
        relayer,
        delegator,
        clearStorageHelper,
        safeModuleSetup,
    };
};

const main = async () => {
    const provider = ethers.provider;
    const { safeSingleton, fallbackHandler, relayer, delegator, safeModuleSetup } = await setup(provider);
    const pkDelegator = process.env.ACCOUNT_PRIVATE_KEY || "";
    const relayerSigningKey = new SigningKey(process.env.RELAYER_PRIVATE_KEY || "");

    const chainId = (await provider.getNetwork()).chainId;
    const authNonce = BigInt(await delegator.getNonce());

    const fallbackHandlerAddress = await fallbackHandler.getAddress();
    const data = await getSetupDataForSingleton(delegator, await safeModuleSetup.getAddress(), [fallbackHandlerAddress], fallbackHandlerAddress);

    const authAddress = await safeSingleton.getAddress();

    const authorizationList = getAuthorizationList(chainId, authNonce, pkDelegator, authAddress);
    const encodedSignedTx = await getSignedTransaction(provider, relayerSigningKey, authorizationList);

    const account = await delegator.getAddress();

    const isAlreadyDelegated = await isAccountDelegatedToAddress(provider, await delegator.getAddress(), authAddress);
    if (isAlreadyDelegated && (await provider.getStorage(account, 4)) == ethers.zeroPadValue("0x01", 32)) {
        console.log("Account already delegated to Safe Singleton and storage is setup. Returning");
        return;
    }

    const response = await provider.send("eth_sendRawTransaction", [encodedSignedTx]);
    console.log("Set Auth transaction hash", response);

    console.log("Waiting for transaction confirmation");
    await (await provider.getTransaction(response))?.wait();

    console.log(await delegator.getAddress(), authAddress);
    console.log("Code at account: ", await provider.getCode(account));

    console.log("Account successfully delegated to Safe Singleton");

    const setupTxResponse = await relayer.sendTransaction({ to: await delegator.getAddress(), data: data });
    await setupTxResponse.wait();

    await printAccountStorage(provider, account, await safeSingleton.getAddress());
};

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
