import {
  Account,
  Chain,
  createPublicClient,
  createWalletClient,
  defineChain,
  http,
  PublicClient,
  WalletClient,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { eip7702Actions } from "viem/experimental";

export const account = privateKeyToAccount(process.env.RELAYER_PRIVATE_KEY as `0x${string}`);

const pectraDevnet = defineChain({
  id: 7042905162,
  name: "pectra-devnet-3",
  nativeCurrency: {
    name: "Ethereum",
    symbol: "ETH",
    decimals: 18,
  },
  rpcUrls: {
    default: {
      http: [process.env.RPC_URL_PECTRA as string],
      webSocket: undefined,
    },
  },
});

const pectraWalletClient = createWalletClient({
  account,
  chain: pectraDevnet,
  transport: http(),
}).extend(eip7702Actions());

const pectraPublicClient = createPublicClient({
  chain: pectraDevnet,
  transport: http(),
});

const customChain = defineChain({
  id: parseInt(process.env.NETWORK_ID as string),
  name: "local",
  nativeCurrency: {
    name: "Ethereum",
    symbol: "ETH",
    decimals: 18,
  },
  rpcUrls: {
    default: {
      http: [process.env.RPC_URL_CUSTOM as string],
    },
  },
});

const customPublicClient = createPublicClient({
  chain: customChain,
  transport: http(process.env.RPC_URL_CUSTOM),
});

export const getWalletClient = async (chainId: number): Promise<WalletClient> => {
  if (chainId == (process.env.NETWORK_ID as unknown as number)) {
    return createWalletClient({
      account,
      chain: customChain,
      transport: http(process.env.RPC_URL_CUSTOM),
    }).extend(eip7702Actions());
  } else if (chainId == pectraDevnet.id) {
    return pectraWalletClient;
  }
  throw new Error(`Unsupported chainId: [${chainId}]. No wallet client available.`);
};

export const getPublicClient = (chainId: number): PublicClient => {
  if (chainId == (process.env.NETWORK_ID as unknown as number)) {
    return customPublicClient;
  } else if (chainId == pectraDevnet.id) {
    return pectraPublicClient;
  }
  throw new Error(`Unsupported chainId: [${chainId}]. No public client available.`);
};

export const getAccount = (chainId: number): Account => account;

export const getChain = (chainId: number): Chain => {
  return customChain;
};
