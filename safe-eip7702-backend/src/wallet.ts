import { createPublicClient, createWalletClient, defineChain, http } from "viem";
import { privateKeyToAccount } from 'viem/accounts'
import { eip7702Actions } from 'viem/experimental'

export const pectraDevnet = defineChain({
    id: 7011893082,
    name: "pectra-devnet-3",
    nativeCurrency: {
      name: "Ethereum",
      symbol: "ETH",
      decimals: 18
    },
    rpcUrls: {
      default: {
        http: ["https://rpc.pectra-devnet-3.ethpandaops.io"],
        webSocket: undefined
      }
    }
});

export const account = privateKeyToAccount(process.env.RELAYER_PRIVATE_KEY as `0x${string}`);

export const walletClient = createWalletClient({
    account,
    chain: pectraDevnet,
    transport: http(),
}).extend(eip7702Actions());


export const client = createPublicClient({
  chain: pectraDevnet,
  transport: http(),
});

