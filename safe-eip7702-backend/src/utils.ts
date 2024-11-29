import { parseAbi, toBytes, encodePacked } from 'viem'

export type SafeStorage = {
  owners: string[]
  threshold: number
  nonce: number
  fallbackHandler: string
  modules: string[]
  guard: string
}

export const getSafeStorage = (): SafeStorage => {
  return {
    owners: [],
    threshold: 0,
    nonce: 0,
    fallbackHandler: '',
    modules: [],
    guard: ''
  }
}

export const MultiSendABI = parseAbi([
  'function multiSend(bytes transactions) public payable'
])

// Assuming MetaTransaction interface looks something like this:
export interface MetaTransaction {
  to: `0x${string}` // address
  value: bigint // uint256
  data: `0x${string}` // bytes
}

// Function to encode a single meta-transaction
const encodeMetaTransaction = (tx: MetaTransaction): string => {
  // Convert data into bytes format
  const data = toBytes(tx.data)

  // Encode using encodePacked (similar to ethers' solidityPacked)
  const encoded = encodePacked(
    ['uint8', 'address', 'uint256', 'uint256', 'bytes'], // Solidity types
    [0, tx.to, tx.value, BigInt(data.length), tx.data] // Values to encode
  )

  return encoded.slice(2) // Remove '0x' from the encoded result
}
// Function to encode multiple transactions for multiSend

export const encodeMultiSend = (txs: MetaTransaction[]): `0x${string}` => {
  return ('0x' +
    txs.map((tx) => encodeMetaTransaction(tx)).join('')) as `0x${string}`
}

export const getDefaultEmptyTransaction = (): MetaTransaction => {
  return {
    to: ('0x' + '00'.repeat(20)) as `0x${string}`, // to: empty address
    value: BigInt(0), // value: 0
    data: '0x' as `0x${string}` // data: empty
  }
}
