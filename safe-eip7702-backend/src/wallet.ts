import {
  Account,
  Chain,
  createPublicClient,
  createWalletClient,
  defineChain,
  http,
  PublicClient,
  WalletClient
} from 'viem'
import { privateKeyToAccount } from 'viem/accounts'
import { eip7702Actions } from 'viem/experimental'
import { safeEIP7702Addresses } from './config/addresses'

const chains: any = {}

Object.keys(safeEIP7702Addresses).map((key: string) => {
  const account = privateKeyToAccount(
    process.env.RELAYER_PRIVATE_KEY as `0x${string}`
  )

  const chain = defineChain({
    id: parseInt(key),
    name: safeEIP7702Addresses[key].name,
    nativeCurrency: {
      name: 'Ethereum',
      symbol: 'ETH',
      decimals: 18
    },
    rpcUrls: {
      default: {
        http: [safeEIP7702Addresses[key].rpc as string],
        webSocket: undefined
      }
    },
    testnet: safeEIP7702Addresses[key].testnet
  })

  const walletClient = createWalletClient({
    account,
    chain: chain,
    transport: http(safeEIP7702Addresses[key].rpc)
  }).extend(eip7702Actions())

  const publicClient = createPublicClient({
    chain: chain,
    transport: http(safeEIP7702Addresses[key].rpc)
  })

  chains[parseInt(key)] = {
    chain: chain,
    walletClient: walletClient,
    publicClient: publicClient,
    account: account
  }
})

console.log('chains', chains)
export const getWalletClient = async (
  chainId: number
): Promise<WalletClient> => {
  if (chains[chainId]) return chains[chainId].walletClient
  throw new Error(
    `Unsupported chainId: [${chainId}]. No wallet client available.`
  )
}

export const getPublicClient = (chainId: number): PublicClient => {
  if (chains[chainId]) return chains[chainId].publicClient
  throw new Error(
    `Unsupported chainId: [${chainId}]. No public client available.`
  )
}

export const getAccount = (chainId: number): Account => {
  if (chains[chainId]) return chains[chainId].account
  throw new Error(`Unsupported chainId: [${chainId}]. No account available.`)
}

export const getChain = (chainId: number): Chain => {
  if (chains[chainId]) return chains[chainId].chain
  throw new Error(
    `Unsupported chainId: [${chainId}]. No chain information available.`
  )
}
