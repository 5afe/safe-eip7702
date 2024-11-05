
export enum FEATURES {
  SUPPORT_4337
}

export const safeEIP7702Config: any = {
  7042905162: {
    rpc: import.meta.env.VITE_PECTRA_RPC_URL,
    name: "pectra-devnet",
    explorer: "https://explorer.pectra-devnet-4.ethpandaops.io",
    addresses: {
      proxyFactory: "0xE60EcE6588DCcFb7373538034963B4D20a280DB0",
      safeSingleton: "0xCfaA26AD40bFC7E3b1642E1888620FC402b95dAB",
      fallbackHandler: "0x4fFeBe9E5af056a73555223E9319Ae94D43461C0",
      moduleSetup: "0x2204DcA7d254897ae6d815D2189032db87F50Bba",
      multiSend: "0xd58De9D288831482346fA36e6bdc16925d9cFC85",
      multiSendCallOnly: "0x4873593fC8e788eFc06287327749fdDe08C0146b"
    },
    features: []
  },
  [parseInt(import.meta.env.VITE_NETWORK_ID) || ""]: {
    rpc: import.meta.env.VITE_RPC_URL,
    name: import.meta.env.VITE_NETWORK_NAME,
    explorer: import.meta.env.VITE_EXPLORER_URL,
    addresses: {
      proxyFactory: import.meta.env.VITE_PROXY_FACTORY,
      safeSingleton: import.meta.env.VITE_SAFE_SINGLETON,
      fallbackHandler: import.meta.env.VITE_FALLBACK_HANDLER,
      moduleSetup: import.meta.env.VITE_MODULE_SETUP,
      multiSend: import.meta.env.VITE_MULTI_SEND,
      multiSendCallOnly: import.meta.env.VITE_MULTI_SEND_CALL_ONLY
    },
    features: []
  },
  911867: {
    rpc: "https://odyssey.ithaca.xyz",
    name: "ithaca",
    explorer: "https://odyssey-explorer.ithaca.xyz",
    addresses: {
      proxyFactory: "0xE60EcE6588DCcFb7373538034963B4D20a280DB0",
      safeSingleton: "0xCfaA26AD40bFC7E3b1642E1888620FC402b95dAB",
      fallbackHandler: "0x75cf11467937ce3F2f357CE24ffc3DBF8fD5c226",
      moduleSetup: "0x2204DcA7d254897ae6d815D2189032db87F50Bba",
      multiSend: "0xd58De9D288831482346fA36e6bdc16925d9cFC85",
      multiSendCallOnly: "0x4873593fC8e788eFc06287327749fdDe08C0146b",
      safe4337Module: "0x75cf11467937ce3F2f357CE24ffc3DBF8fD5c226"
    },
    features: [FEATURES.SUPPORT_4337]
  }
};

export const defaultChainId = parseInt(import.meta.env.VITE_DEFAULT_CHAIN_ID);
