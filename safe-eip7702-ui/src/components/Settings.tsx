import React, { useContext, useEffect } from 'react';
import { CircularProgress, Typography } from '@mui/material';
import Grid from '@mui/material/Grid2';
import { WalletContext } from '../context/WalletContext';
import { readStorage, SafeStorage, SENTINEL_ADDRESS } from '../utils/storageReader';
import { createPublicClient, getContract, http, isAddressEqual } from 'viem';
import { safeEIP7702Addresses } from '../safe-eip7702-config/address';
import { ACCOUNT_CODE_PREFIX } from '../utils/utils';
import safeArtifact from "../safe-eip7702-config/artifact/Safe.json"

const Settings: React.FC = () => {

  const { account, chainId } = useContext(WalletContext)!;
  const [safeStorage, setSafeStorage] = React.useState<SafeStorage>();
  const [loading, setLoading] = React.useState<boolean>(false);
  const [accountCode, setAccountCode] = React.useState<string>();
  const [owners, setOwners] = React.useState<string[]>();
  const [modules, setModules] = React.useState<string[]>();
  const [isDelegated, setIsDelegated] = React.useState<boolean>(false);


  const publicClient = createPublicClient({
    transport: http(safeEIP7702Addresses[chainId].rpc),
  });

  useEffect(() => {
    (async () => {
      if (!account) return;
      setLoading(true);
      const storage = await readStorage(publicClient, account.address)
      const accountCode = await publicClient.getCode({ address: account.address });

      if (accountCode && accountCode.startsWith(ACCOUNT_CODE_PREFIX)) {
        setIsDelegated(true);
      }

      if (isAddressEqual(storage.singleton, safeEIP7702Addresses[chainId].addresses.safeSingleton)) {

        const contract = getContract({
          address: account.address,
          abi: safeArtifact.abi,
          client: publicClient,
        })

        const owners = await contract.read.getOwners() as string[] || [];
        setOwners(owners);

        const modulesResult = await contract.read.getModulesPaginated([SENTINEL_ADDRESS, 10]) as string[][];
        if (modulesResult && modulesResult.length > 0) {
          const modules = modulesResult[0].map((module: string) => module);
          setModules(modules);
        }
      }

      console.log('Read storage', storage);

      setAccountCode(accountCode);
      setSafeStorage(storage);
      setLoading(false);
    })();
  }, []);


  return (
    <div style={{ color: '#00ff00', textAlign: 'center', marginTop: '20px' }}>
      <Typography variant="h4">Account storage</Typography>

      {loading ? <CircularProgress /> : (<Grid container spacing={2}>
        <Grid size={12}>Singleton: {safeStorage?.singleton}</Grid>
        <Grid size={12}>Fallbackhandler: {safeStorage?.fallbackHandler}</Grid>
        <Grid size={12}>Threshold: {safeStorage?.threshold.toString()}</Grid>
        <Grid size={12}>Nonce: {safeStorage?.nonce.toString()}</Grid>
        <Grid size={12}>Owner Count: {safeStorage?.ownerCount.toString()}</Grid>
        <Grid size={12}>Delegatee: {isDelegated && accountCode ? "0x" + accountCode.slice(8,) : ""}</Grid>
        <Grid size={12}>
          Owners: {owners?.map(owner => <Grid key={owner}>{owner}</Grid>)}
        </Grid>
        <Grid size={12}>
          Modules: {modules?.map(module => <Grid key={module}>{module}</Grid>)}
        </Grid>
      </Grid>

      )}

    </div>
  );
};

export default Settings;
