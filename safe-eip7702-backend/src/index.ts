import express, { Request, Response } from 'express'
import dotenv from 'dotenv'
import cors from 'cors'
dotenv.config()

import { safeEIP7702Addresses } from './config/addresses'
import {
  getAccount,
  getChain,
  getPublicClient,
  getWalletClient
} from './wallet'
import { toHex, zeroHash, encodeFunctionData, zeroAddress } from 'viem'
import { MultiSendABI } from './utils'
import { encodeMultiSend, MetaTransaction } from './multisend'
import SafeEIP7702ProxyFactoryArtifact from './artifacts/SafeEIP7702ProxyFactory.json'

const TX_GAS = process.env.TX_GAS || 1_000_000

declare global {
  interface BigInt {
    toJSON(): Number
  }
}

BigInt.prototype.toJSON = function () {
  return Number(this)
}

const app = express()
app.use(express.json())
app.use(cors())

app.get('/', (req: Request, res: Response) => {
  res.send({
    Description: 'Relayer for Safe EIP-7702',
    supportedChains: Object.keys(safeEIP7702Addresses)
  })
})

app.post('/', async (req: Request, res: Response) => {
  const { initData, authorizationList, from } = req.body
  const chainId = authorizationList[0].chainId as number

  const proxyAddress = authorizationList[0].contractAddress as `0x${string}`
  const addresses = safeEIP7702Addresses[chainId]

  // Check if chain is supported
  if (!addresses) {
    res
      .status(400)
      .json({
        error: `Chain not supported. No proxy factory found for chainId: ${chainId}`
      })
    return
  }

  let transactions: MetaTransaction[] = []

  if (initData) {
    const publicClient = getPublicClient(chainId)

    const proxyCalldata = encodeFunctionData({
      abi: SafeEIP7702ProxyFactoryArtifact.abi,
      functionName: 'createProxyWithNonce',
      args: [addresses.safeSingleton, initData, BigInt(0)]
    })

    // Check if proxy is already deployed
    if (await publicClient.getCode({ address: proxyAddress })) {
      console.log(`Proxy already deployed [${proxyAddress}]`)
    } else {
      console.log(`Adding transaction to deploy proxy [${proxyAddress}]`)
      // Transaction to deploy proxy with initData
      transactions.push({
        to: addresses.proxyFactory as `0x${string}`, // to: proxy factory address
        value: BigInt(0), // value: 0
        data: proxyCalldata as `0x${string}`, // data: initData
        operation: 0
      })
    }
  }

  const publicClient = getPublicClient(chainId)

  // Check if EOA is already initialized
  const slotZero = await publicClient.getStorageAt({
    address: from,
    slot: toHex(0)
  })
  if (slotZero === zeroHash) {
    // Transaction to initialize EOA
    transactions.push({
      to: from, // to: EOA address
      value: BigInt(0), // value: 0
      data: initData, // data: Init data
      operation: 0
    })
    console.log(`Added transaction to initialize EOA [${from}]`)
  } else {
    console.log(`EOA [${from}] already initialized. Slot 0: [${slotZero}]`)
  }

  try {
    let txHash
    if (transactions.length > 0) {
      // Encode all transactions into a single byte string for multiSend
      const encodedTransactions = encodeMultiSend(transactions)

      const data = encodeFunctionData({
        abi: MultiSendABI,
        functionName: 'multiSend',
        args: [encodedTransactions]
      })

      const walletClient = await getWalletClient(chainId)

      const request = await walletClient.prepareTransactionRequest({
        chain: getChain(chainId),
        account: getAccount(chainId),
        to: addresses.multiSendCallOnly, // The address of the MultiSendCallOnly contract
        data: data, // MultiSend call
        value: BigInt(0), // Value sent with the transaction
        authorizationList,
        gas: BigInt(TX_GAS)
      })

      console.log(
        `Sending transaction on chain [${chainId}] for EOA [${from}]`,
        request
      )
      const serializedTransaction = await walletClient.signTransaction(request)
      // Send the multiSend transaction
      txHash = await walletClient.sendRawTransaction({ serializedTransaction })
    } else {
      const walletClient = await getWalletClient(chainId)
      console.log(
        `Sending only authorization transaction on chain [${chainId}] for EOA [${from}]`
      )
      txHash = await walletClient.sendTransaction({
        account: getAccount(chainId),
        chain: getChain(chainId),
        to: zeroAddress,
        data: '0x',
        value: BigInt(0),
        authorizationList,
        gas: BigInt(TX_GAS)
      })
    }

    console.log(`Transaction hash: [${txHash}]`)
    res.status(201).json({ txHash: txHash })
  } catch (error) {
    console.error('Failed to relay authorization', error)
    res.status(500).json({ error: error })
  }
})

const port = process.env.PORT || 3000

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`)
})
