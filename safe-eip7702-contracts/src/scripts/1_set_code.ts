import dotenv from 'dotenv'
dotenv.config()
import { deployments, ethers } from 'hardhat'
import { isAccountDelegatedToAddress } from '../eip7702/storage'
import { Provider, SigningKey } from 'ethers'
import { printAccountStorage } from '../utils/storageReader'
import { getSetupData } from '../utils/safe'
import {
  calculateProxyAddress,
  getAuthorizationList,
  getSignedTransaction
} from '../eip7702/helper'
import {
  getClearStorageHelper,
  getCompatibilityFallbackHandler,
  getIDAFallbackHandler,
  getSafeEIP7702ProxyFactory,
  getSafeModuleSetup,
  getSafeSingleton
} from '../utils/setup'
import { SafeEIP7702ProxyFactory } from '../../typechain-types'

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

  const fallbackHandler = await getIDAFallbackHandler()
  const safeSingleton = await getSafeSingleton()
  const safeCompatibilityFallbackHandler =
    await getCompatibilityFallbackHandler()
  const clearStorageHelper = await getClearStorageHelper()
  const safeModuleSetup = await getSafeModuleSetup()
  const safeEIP7702ProxyFactory: SafeEIP7702ProxyFactory =
    await getSafeEIP7702ProxyFactory()
  return {
    fallbackHandler,
    safeSingleton,
    safeCompatibilityFallbackHandler,
    relayer,
    delegator,
    clearStorageHelper,
    safeModuleSetup,
    safeEIP7702ProxyFactory
  }
}

const main = async () => {
  const provider = ethers.provider
  const {
    safeSingleton,
    fallbackHandler,
    relayer,
    delegator,
    safeModuleSetup,
    safeEIP7702ProxyFactory
  } = await setup(provider)
  const pkDelegator = process.env.ACCOUNT_PRIVATE_KEY || ''
  const relayerSigningKey = new SigningKey(
    process.env.RELAYER_PRIVATE_KEY || ''
  )

  const chainId = (await provider.getNetwork()).chainId
  const authNonce = BigInt(await delegator.getNonce())

  // Deploy SafeProxy with the delegator as owner
  const owners = [delegator]
  const ownerAddresses = await Promise.all(
    owners.map(async (owner): Promise<string> => await owner.getAddress())
  )

  const fallbackHandlerAddress = await fallbackHandler.getAddress()
  const data = getSetupData(
    ownerAddresses,
    1,
    await safeModuleSetup.getAddress(),
    [fallbackHandlerAddress],
    fallbackHandlerAddress
  )

  const proxyAddress = await calculateProxyAddress(
    safeEIP7702ProxyFactory,
    await safeSingleton.getAddress(),
    data,
    0
  )
  const isContract =
    (await provider.getCode(proxyAddress)) === '0x' ? false : true

  if (!isContract) {
    console.log(`Deploying Proxy [${proxyAddress}]`)
    const tx = await safeEIP7702ProxyFactory
      .connect(relayer)
      .createProxyWithNonce(await safeSingleton.getAddress(), data, 0)
    await tx.wait()
    console.log(`Proxy deployment transaction hash: [${tx.hash}]`)
  } else {
    console.log('Proxy already deployed: ', proxyAddress)
  }

  const authAddress = proxyAddress

  const authorizationList = getAuthorizationList(
    chainId,
    authNonce,
    pkDelegator,
    authAddress
  )
  const encodedSignedTx = await getSignedTransaction(
    provider,
    relayerSigningKey,
    authorizationList
  )

  const account = await delegator.getAddress()

  const isAlreadyDelegated = await isAccountDelegatedToAddress(
    provider,
    await delegator.getAddress(),
    authAddress
  )
  if (
    isAlreadyDelegated &&
    (await provider.getStorage(account, 4)) == ethers.zeroPadValue('0x01', 32)
  ) {
    console.log(
      'Account already delegated to Safe Proxy and storage is setup. Returning'
    )
    return
  }

  const response = await provider.send('eth_sendRawTransaction', [
    encodedSignedTx
  ])
  console.log('Set Auth transaction hash', response)

  console.log('Waiting for transaction confirmation')
  await (await provider.getTransaction(response))?.wait()

  console.log(await delegator.getAddress(), authAddress)
  console.log('Code at account: ', await provider.getCode(account))

  console.log('Account successfully delegated to Safe Proxy')

  const setupTxResponse = await relayer.sendTransaction({
    to: await delegator.getAddress(),
    data: data
  })
  await setupTxResponse.wait()

  await printAccountStorage(provider, account, await safeSingleton.getAddress())
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
