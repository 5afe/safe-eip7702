export const safeEIP7702Config: any = {
  7042905162: {
    rpc: import.meta.env.VITE_PECTRA_RPC_URL,
    name: "pectra-devnet",
    addresses: {
      proxyFactory: "0xE60EcE6588DCcFb7373538034963B4D20a280DB0",
      safeSingleton: "0xCfaA26AD40bFC7E3b1642E1888620FC402b95dAB",
      fallbackHandler: "0x0F71638a741E7fe77E6A2D9986BA175b95F209d4",
      moduleSetup: "0x2204DcA7d254897ae6d815D2189032db87F50Bba",
      multiSend: "0xd58De9D288831482346fA36e6bdc16925d9cFC85",
      multiSendCallOnly: "0x4873593fC8e788eFc06287327749fdDe08C0146b"
    }
  },    
  [parseInt(import.meta.env.VITE_NETWORK_ID) || "" ]: {
    rpc: import.meta.env.VITE_RPC_URL,
    name: import.meta.env.VITE_NETWORK_NAME,
    addresses: {
      proxyFactory: import.meta.env.VITE_PROXY_FACTORY,
      safeSingleton: import.meta.env.VITE_SAFE_SINGLETON,
      fallbackHandler: import.meta.env.VITE_FALLBACK_HANDLER,
      moduleSetup: import.meta.env.VITE_MODULE_SETUP,
      multiSend: import.meta.env.VITE_MULTI_SEND,
      multiSendCallOnly: import.meta.env.VITE_MULTI_SEND_CALL_ONLY
    }
  }
};

export const defaultChainId = parseInt(import.meta.env.VITE_DEFAULT_CHAIN_ID);
