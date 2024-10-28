import React, { createContext, useState, ReactNode } from 'react';
import { isHex, PrivateKeyAccount } from 'viem'; // Import viem library for validation
import { privateKeyToAccount } from 'viem/accounts';
import { Authorization } from 'viem/experimental';
import { defaultChainId } from '../safe-eip7702-config/config';

interface WalletContextType {
  privateKey: `0x${string}` | undefined;
  setPrivateKey: (key: `0x${string}` | undefined) => void;
  isPrivateKeyValid: boolean;
  account: PrivateKeyAccount | undefined;
  setAccount: (account: any) => void;
  authorizations: Authorization[];
  setAuthorizations: (authorizations: Authorization[]) => void;
  chainId: number;
  setChainId: (chainId: number) => void;
}

// Create the context
export const WalletContext = createContext<WalletContextType | undefined>(undefined);

// Create a provider component
export const WalletProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [privateKey, setPrivateKey] = useState<`0x${string}`>(import.meta.env.VITE_PRIVATE_KEY);
  const [isPrivateKeyValid, setIsPrivateKeyValid] = useState<boolean>(true);
  const [account, setAccount] = useState<PrivateKeyAccount>(privateKeyToAccount(import.meta.env.VITE_PRIVATE_KEY));
  const [authorizations, setAuthorizations] = useState<Authorization[]>([]);
  const [chainId, setChainId] = useState<number>(defaultChainId);
  // Function to validate the private key
  const validatePrivateKey = (key: `0x${string}` | undefined) => {
    if (key && key.startsWith('0x') && isHex(key) && key.length === 66) {
      setIsPrivateKeyValid(true);
      setAccount(privateKeyToAccount(key));
    } else {
      setIsPrivateKeyValid(false);
    }
    setPrivateKey(key as `0x${string}`);
  };

  return (
    <WalletContext.Provider value={{ chainId, setChainId, authorizations, setAuthorizations, privateKey, setPrivateKey: validatePrivateKey, isPrivateKeyValid, account, setAccount }}>
      {children}
    </WalletContext.Provider>
  );
};
