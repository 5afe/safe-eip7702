import dotenv from "dotenv";
dotenv.config();
import { deployments, ethers } from "hardhat";
import { execTransaction } from "../utils/safe";
import {
    getSafeAtAddress,
} from "../utils/setup";
import { Provider } from "ethers";

const setup = async (provider: Provider) => {
    await deployments.fixture();

    const delegator = new ethers.Wallet(process.env.ACCOUNT_PRIVATE_KEY || "", provider);
    const relayer = new ethers.Wallet(process.env.RELAYER_PRIVATE_KEY || "", provider);

    return {
        relayer,
        delegator,
    };
};

const main = async () => {
    const rpc = process.env.RPC_URL;
    const provider = new ethers.JsonRpcProvider(rpc);
    const { relayer, delegator } = await setup(provider);
    const owners = [delegator];
    const account = await delegator.getAddress();
    console.log(`Using account [${account}]`);
    const safe = await getSafeAtAddress(account);

    const amount = 1n;
    if ((await provider.getBalance(account)) < amount) {
        await relayer.sendTransaction({
            to: account,
            value: amount,
        });
    }

    // Transfer value from the account
    const tx = await execTransaction(relayer, owners, safe, await relayer.getAddress(), amount.toString(), "0x", "0");
    console.log("Transfer value txHash", (await tx.wait())?.hash);
};

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
