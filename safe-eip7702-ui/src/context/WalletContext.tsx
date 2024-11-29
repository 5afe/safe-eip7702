import React, { createContext, useState, ReactNode, useEffect } from 'react'
import {
  Address,
  Chain,
  createPublicClient,
  defineChain,
  getContract,
  http,
  isAddress,
  isAddressEqual,
  isHex,
  PrivateKeyAccount,
  PublicClient
} from 'viem' // Import viem library for validation
import { privateKeyToAccount } from 'viem/accounts'
import { Authorization } from 'viem/experimental'
import {
  defaultChainId,
  FEATURES,
  safeEIP7702Config
} from '../safe-eip7702-config/config'
import {
  readStorage,
  SafeStorage,
  SENTINEL_ADDRESS
} from '../utils/storageReader'
import safeArtifact from '../safe-eip7702-config/artifact/Safe.json'

interface WalletContextType {
  privateKey: `0x${string}` | undefined
  setPrivateKey: (key: `0x${string}` | undefined) => void
  isPrivateKeyValid: boolean
  account: PrivateKeyAccount | undefined
  setAccount: (account: any) => void
  authorizations: Authorization[]
  setAuthorizations: (authorizations: Authorization[]) => void
  chainId: number
  setChainId: (chainId: number) => void
  features: FEATURES[]
  publicClient: PublicClient
  loading: boolean
  safeStorage: SafeStorage | undefined
  accountCode: string | undefined
}

// Create the context
export const WalletContext = createContext<WalletContextType | undefined>(
  undefined
)

// Create a provider component
export const WalletProvider: React.FC<{ children: ReactNode }> = ({
  children
}) => {
  const [privateKey, setPrivateKey] = useState<`0x${string}`>(
    import.meta.env.VITE_PRIVATE_KEY
  )
  const [isPrivateKeyValid, setIsPrivateKeyValid] = useState<boolean>(true)
  const [account, setAccount] = useState<PrivateKeyAccount>(
    privateKeyToAccount(import.meta.env.VITE_PRIVATE_KEY)
  )
  const [authorizations, setAuthorizations] = useState<Authorization[]>([])
  const [chainId, setChainId] = useState<number>(defaultChainId)
  const [features, setFeatures] = useState<FEATURES[]>([])
  const [loading, setLoading] = useState<boolean>(false)
  const [safeStorage, setSafeStorage] = useState<SafeStorage>()
  const [accountCode, setAccountCode] = useState<string>()
  const [chain, setChain] = useState<Chain>()

  const [publicClient, setPublicClient] = useState<PublicClient>(
    createPublicClient({
      transport: http(safeEIP7702Config[chainId].rpc)
    })
  )

  // Function to validate the private key
  const validatePrivateKey = (key: `0x${string}` | undefined) => {
    if (key && key.startsWith('0x') && isHex(key) && key.length === 66) {
      setIsPrivateKeyValid(true)
      setAccount(privateKeyToAccount(key))
    } else {
      setIsPrivateKeyValid(false)
    }
    setPrivateKey(key as `0x${string}`)
  }

  useEffect(() => {
    setFeatures(safeEIP7702Config[chainId].features)

    const chain = defineChain({
      id: chainId,
      name: safeEIP7702Config[chainId].name,
      nativeCurrency: {
        name: 'Ethereum',
        symbol: 'ETH',
        decimals: 18
      },
      rpcUrls: {
        default: {
          http: [safeEIP7702Config[chainId].rpc as string],
          webSocket: undefined
        }
      },
      testnet: safeEIP7702Config[chainId].testnet
    })

    setChain(chain)
    setPublicClient(
      createPublicClient({
        chain: chain,
        transport: http(safeEIP7702Config[chainId].rpc)
      })
    )
  }, [chainId])

  const loadStorage = async () => {
    const accountAddress = account.address
    if (!account || !isAddress(accountAddress)) {
      setAccountCode(undefined)
      setSafeStorage(undefined)
      return
    }
    setLoading(true)
    let storage = await readStorage(publicClient, accountAddress)
    console.log(`Storage values for account [${accountAddress}]:`, storage)
    const accountCode = await publicClient.getCode({ address: accountAddress })

    if (
      isAddressEqual(
        storage.singleton,
        safeEIP7702Config[chainId].addresses.safeSingleton
      )
    ) {
      const contract = getContract({
        address: accountAddress,
        abi: safeArtifact.abi,
        client: publicClient
      })

      storage.owners = ((await contract.read.getOwners()) as Address[]) || []
      // Assumes that there are no more than 10 modules enabled.
      const modulesResult = (await contract.read.getModulesPaginated([
        SENTINEL_ADDRESS,
        10
      ])) as Address[][]
      if (modulesResult && modulesResult.length > 0) {
        storage.modules = modulesResult[0]
      }
    }

    setAccountCode(accountCode)
    setSafeStorage(storage)
    setLoading(false)
  }

  useEffect(() => {
    ;(async () => {
      await loadStorage()
    })()
  }, [account])

  return (
    <WalletContext.Provider
      value={{
        safeStorage,
        accountCode,
        loading,
        publicClient,
        features,
        chainId,
        setChainId,
        authorizations,
        setAuthorizations,
        privateKey,
        setPrivateKey: validatePrivateKey,
        isPrivateKeyValid,
        account,
        setAccount
      }}
    >
      {children}
    </WalletContext.Provider>
  )
}
