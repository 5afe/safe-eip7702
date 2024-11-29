const {
  NETWORK_ID,
  PROXY_FACTORY,
  SAFE_SINGLETON,
  FALLBACK_HANDLER,
  MODULE_SETUP,
  MULTI_SEND,
  MULTI_SEND_CALL_ONLY
} = process.env

export const safeEIP7702Addresses: any = {
  7042905162: {
    rpc: process.env.RPC_URL_PECTRA,
    name: 'pectra-devnet',
    explorer: 'https://explorer.pectra-devnet-4.ethpandaops.io',
    proxyFactory: '0xE60EcE6588DCcFb7373538034963B4D20a280DB0',
    safeSingleton: '0xCfaA26AD40bFC7E3b1642E1888620FC402b95dAB',
    fallbackHandler: '0x4fFeBe9E5af056a73555223E9319Ae94D43461C0',
    moduleSetup: '0x2204DcA7d254897ae6d815D2189032db87F50Bba',
    multiSend: '0xd58De9D288831482346fA36e6bdc16925d9cFC85',
    multiSendCallOnly: '0x4873593fC8e788eFc06287327749fdDe08C0146b',
    testnet: true
  },
  [NETWORK_ID || '']: {
    rpc: process.env.RPC_URL_CUSTOM,
    name: process.env.NETWORK_NAME,
    proxyFactory: PROXY_FACTORY,
    safeSingleton: SAFE_SINGLETON,
    fallbackHandler: FALLBACK_HANDLER,
    moduleSetup: MODULE_SETUP,
    multiSend: MULTI_SEND,
    multiSendCallOnly: MULTI_SEND_CALL_ONLY,
    testnet: true
  },
  911867: {
    rpc: process.env.RPC_URL_ITHACA,
    name: 'ithaca',
    proxyFactory: '0xE60EcE6588DCcFb7373538034963B4D20a280DB0',
    safeSingleton: '0xCfaA26AD40bFC7E3b1642E1888620FC402b95dAB',
    fallbackHandler: '0x4fFeBe9E5af056a73555223E9319Ae94D43461C0',
    moduleSetup: '0x2204DcA7d254897ae6d815D2189032db87F50Bba',
    multiSend: '0xd58De9D288831482346fA36e6bdc16925d9cFC85',
    multiSendCallOnly: '0x4873593fC8e788eFc06287327749fdDe08C0146b',
    testnet: true
  }
}
