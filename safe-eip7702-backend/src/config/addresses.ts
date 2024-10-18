
const {NETWORK_ID, PROXY_FACTORY, SAFE_SINGLETON, FALLBACK_HANDLER, MODULE_SETUP, MULTI_SEND, MULTI_SEND_CALL_ONLY} = process.env;

export const safeEIP7702Addresses: any = {
    7011893082: {
      proxyFactory: "0x05E74aC068A4586dbf934Fea3F3C1D76FC74E8Af",
      safeSingleton: "0xCfaA26AD40bFC7E3b1642E1888620FC402b95dAB",
      fallbackHandler: "0x0F71638a741E7fe77E6A2D9986BA175b95F209d4",
      moduleSetup: "0x2204DcA7d254897ae6d815D2189032db87F50Bba",
      multiSend: "0xd58De9D288831482346fA36e6bdc16925d9cFC85",
      multiSendCallOnly: "0x4873593fC8e788eFc06287327749fdDe08C0146b"
    },
    [NETWORK_ID || "" ]: {
      proxyFactory: PROXY_FACTORY,
      safeSingleton: SAFE_SINGLETON,
      fallbackHandler: FALLBACK_HANDLER,
      moduleSetup: MODULE_SETUP,
      multiSend: MULTI_SEND,
      multiSendCallOnly: MULTI_SEND_CALL_ONLY
    }
  };
