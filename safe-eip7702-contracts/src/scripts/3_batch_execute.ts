import dotenv from 'dotenv'
dotenv.config()
import { deployments, ethers } from 'hardhat'
import { execTransaction } from '../utils/safe'
import {
  getMultiSend,
  getSafeAtAddress,
  getSafeSingleton
} from '../utils/setup'
import { Provider } from 'ethers'
import { encodeMultiSend } from '@safe-global/safe-smart-account/dist/src/utils/multisend'
import { MetaTransaction } from '@safe-global/safe-smart-account'
import { isAccountDelegatedToAddress } from '../eip7702/storage'

const setup = async (provider: Provider) => {
  await deployments.fixture()

  const delegator = new ethers.Wallet(
    process.env.ACCOUNT_PRIVATE_KEY || '',
    provider
  )
  const relayer = new ethers.Wallet(
    process.env.RELAYER_PRIVATE_KEY || '',
    provider
  )
  const multiSend = await getMultiSend()
  const safeSingleton = await getSafeSingleton()

  return {
    relayer,
    delegator,
    multiSend,
    safeSingleton
  }
}

const main = async () => {
  const provider = ethers.provider
  const { relayer, delegator, multiSend, safeSingleton } = await setup(provider)
  const owners = [delegator]
  const account = await delegator.getAddress()
  console.log(`Using account [${account}]`)

  const safeSingletonAddress = await safeSingleton.getAddress()
  const isDelegatedToSafeSingleton = isAccountDelegatedToAddress(
    provider,
    account,
    safeSingletonAddress
  )

  if (!isDelegatedToSafeSingleton) {
    console.log(
      `Account is not delegated to Safe singleton contract [${safeSingletonAddress}]`
    )
    process.exit(1)
  }

  const safe = await getSafeAtAddress(account)

  const amount = 1n * 2n
  if ((await provider.getBalance(account)) < amount) {
    await relayer.sendTransaction({
      to: account,
      value: amount
    })
  }

  const txs: MetaTransaction[] = [
    {
      to: await relayer.getAddress(),
      value: 1n,
      data: '0x',
      operation: 0
    },
    {
      to: await relayer.getAddress(),
      value: 1n,
      data: '0x',
      operation: 0
    }
  ]

  const multiSendData = encodeMultiSend(txs)
  const calldata = multiSend.interface.encodeFunctionData('multiSend', [
    multiSendData
  ])
  const tx = await execTransaction(
    relayer,
    owners,
    safe,
    await multiSend.getAddress(),
    '0',
    calldata,
    '1'
  )
  console.log(`Transaction hash [${(await tx.wait())?.hash}]`)
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
