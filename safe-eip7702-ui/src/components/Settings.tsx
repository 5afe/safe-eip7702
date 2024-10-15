import React, { useContext, useEffect } from 'react';
import { CircularProgress, Typography } from '@mui/material';
import Grid from '@mui/material/Grid2';
import { WalletContext } from '../context/WalletContext';
import { readStorage, SafeStorage } from '../utils/storageReader';
import { createPublicClient, http } from 'viem';
import { safeEIP7702Addresses } from '../safe-eip7702-config/address';

const Settings: React.FC = () => {

  const {account, chainId} = useContext(WalletContext)!;
  const [safeStorage, setSafeStorage] = React.useState<SafeStorage>();
  const [loading, setLoading] = React.useState<boolean>(false);

  const publicClient = createPublicClient({
    transport: http(safeEIP7702Addresses[chainId].rpc),
  });
  
  useEffect(() => {
    (async () => {
      if(!account) return;
      setLoading(true);
      const storage = await readStorage(publicClient, account.address)
      console.log('Read storage', storage);
      setSafeStorage(storage);
      setLoading(false);
    })();
  }, []);

  return (
    <div style={{ color: '#00ff00', textAlign: 'center', marginTop: '20px' }}>
      <Typography variant="h4">Account storage</Typography>
      {loading ? <CircularProgress/> : (<Grid container spacing={2}>
        <Grid size={12}>Singleton: {safeStorage?.singleton}</Grid>
        <Grid size={12}>Fallbackhandler: {safeStorage?.fallbackHandler}</Grid>
        <Grid size={12}>Threshold: {safeStorage?.threshold.toString()}</Grid>
        <Grid size={12}>Nonce: {safeStorage?.nonce.toString()}</Grid>
        <Grid size={12}>Owner Count: {safeStorage?.ownerCount.toString()}</Grid>
      </Grid>)}
      
    </div>
  );
};

export default Settings;
