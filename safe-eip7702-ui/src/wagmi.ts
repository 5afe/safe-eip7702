import { defineChain } from 'viem'
import { http, createConfig } from 'wagmi'
import { mainnet, sepolia } from 'wagmi/chains'
import { coinbaseWallet, injected } from 'wagmi/connectors'

// export const pectraDevnet = defineChain({
//   id: 7042905162,
//   name: "pectra-devnet-3",
//   nativeCurrency: {
//     name: "Ethereum",
//     symbol: "ETH",
//     decimals: 18
//   },
//   rpcUrls: {
//     default: {
//       http: ["https://rpc.pectra-devnet-3.ethpandaops.io"],
//       webSocket: undefined
//     }
//   }
// });

export const config = createConfig({
  chains: [mainnet, sepolia],
  connectors: [
    injected(),
    coinbaseWallet()
    // walletConnect({ projectId: import.meta.env.VITE_WC_PROJECT_ID }),
  ],
  transports: {
    [mainnet.id]: http(),
    [sepolia.id]: http()
    // [pectraDevnet.id]: http(),
  }
})

declare module 'wagmi' {
  interface Register {
    config: typeof config
  }
}
