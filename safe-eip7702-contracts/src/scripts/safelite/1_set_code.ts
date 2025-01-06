import dotenv from "dotenv";
dotenv.config();
import { deployments, ethers } from "hardhat";
import { isAccountDelegatedToAddress } from "../../eip7702/storage";
import { Provider, SigningKey } from "ethers";
import { printAccountStorage } from "../../utils/storageReader";
import { getAuthorizationList, getSignedTransaction } from "../../eip7702/helper";
import {
    getSafeLite,
} from "../../utils/setup";

const setup = async (provider: Provider) => {
    await deployments.fixture();

    const delegator = new ethers.Wallet(process.env.ACCOUNT_PRIVATE_KEY || "", provider);
    const relayer = new ethers.Wallet(process.env.RELAYER_PRIVATE_KEY || "", provider);

    const safeLite = await getSafeLite();
    return {
        safeLite,
        relayer,
        delegator,
    };
};

const main = async () => {
    const provider = ethers.provider;
    const { safeLite, relayer, delegator } = await setup(provider);
    const pkDelegator = process.env.ACCOUNT_PRIVATE_KEY || "";
    const relayerSigningKey = new SigningKey(process.env.RELAYER_PRIVATE_KEY || "");
    const chainId = (await provider.getNetwork()).chainId;
    const authNonce = BigInt(await delegator.getNonce());

    const authAddress = await safeLite.getAddress();

    const authorizationList = getAuthorizationList(chainId, authNonce, pkDelegator, authAddress);
    const encodedSignedTx = await getSignedTransaction(provider, relayerSigningKey, authorizationList);

    const account = await delegator.getAddress();

    const isAlreadyDelegated = await isAccountDelegatedToAddress(provider, await delegator.getAddress(), authAddress);
    if (isAlreadyDelegated) {
        console.log("Account already delegated to SafeLite. Returning");
        return;
    }

    const response = await provider.send("eth_sendRawTransaction", [encodedSignedTx]);
    console.log("Set Auth transaction hash", response);

    console.log("Waiting for transaction confirmation");
    await (await provider.getTransaction(response))?.wait();

    console.log(await delegator.getAddress(), authAddress);
    console.log("Code at account: ", await provider.getCode(account));

    console.log("Account successfully delegated to SafeLite");

    await printAccountStorage(provider, account, await safeLite.getAddress());
};

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
