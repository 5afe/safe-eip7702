import React, { useContext, useEffect } from "react";
import { Alert, Box, Button, CircularProgress, TextField, Typography } from "@mui/material";
import Grid from "@mui/material/Grid2";
import { WalletContext } from "../context/WalletContext";
import { readStorage, SafeStorage, SENTINEL_ADDRESS } from "../utils/storageReader";
import { Address, createPublicClient, getContract, http, isAddress, isAddressEqual, zeroAddress } from "viem";
import { safeEIP7702Config } from "../safe-eip7702-config/config";
import { ACCOUNT_CODE_PREFIX } from "../utils/utils";
import safeArtifact from "../safe-eip7702-config/artifact/Safe.json";

const Settings: React.FC = () => {
  const { account, chainId } = useContext(WalletContext)!;
  const [accountAddress, setAccountAddress] = React.useState<Address>(account?.address || zeroAddress);
  const [safeStorage, setSafeStorage] = React.useState<SafeStorage>();
  const [loading, setLoading] = React.useState<boolean>(false);
  const [accountCode, setAccountCode] = React.useState<string>();
  const [owners, setOwners] = React.useState<string[]>();
  const [modules, setModules] = React.useState<string[]>();
  const [isDelegated, setIsDelegated] = React.useState<boolean>(false);
  const [isDelegatedToSafeSingleton, setIsDelegatedToSafeSingleton] = React.useState<boolean>(false);

  const publicClient = createPublicClient({
    transport: http(safeEIP7702Config[chainId].rpc),
  });

  const loadStorage = async () => {
    if (!account || !isAddress(accountAddress)) return;
    setLoading(true);
    const storage = await readStorage(publicClient, accountAddress);
    const accountCode = await publicClient.getCode({ address: accountAddress });

    if (accountCode && accountCode.startsWith(ACCOUNT_CODE_PREFIX)) {
      setIsDelegated(true);
    }

    if (isAddressEqual(storage.singleton, safeEIP7702Config[chainId].addresses.safeSingleton)) {
      setIsDelegatedToSafeSingleton(true);

      const contract = getContract({
        address: accountAddress,
        abi: safeArtifact.abi,
        client: publicClient,
      });

      const owners = ((await contract.read.getOwners()) as string[]) || [];
      setOwners(owners);

      const modulesResult = (await contract.read.getModulesPaginated([SENTINEL_ADDRESS, 10])) as string[][];
      if (modulesResult && modulesResult.length > 0) {
        const modules = modulesResult[0].map((module: string) => module);
        setModules(modules);
      }
    }

    console.log("Read storage", storage);

    setAccountCode(accountCode);
    setSafeStorage(storage);
    setLoading(false);
  };

  useEffect(() => {
    (async () => {
      await loadStorage();
    })();
  }, []);

  return (
    <Box id="settings-gird-container">
      <Grid>
        <Typography variant="h4">Account storage</Typography>
      </Grid>
      <Grid container size={12} justifyContent="center" alignItems="center" spacing={2}>
        <Grid size={10}>
          <TextField
            variant="outlined"
            fullWidth
            value={accountAddress}
            onChange={(e) => setAccountAddress(e.target.value as `0x${string}`)}
            placeholder="Enter account address"
            margin="normal"
            error={!isAddress(accountAddress)}
            helperText={!isAddress(accountAddress) && "Invalid address"}
          />
        </Grid>
        <Grid size={2} justifyContent="center" alignItems="center">
          <Button variant="contained" onClick={loadStorage} disabled={!isAddress(accountAddress) || loading}>
            Load
          </Button>
        </Grid>
      </Grid>
      {loading ? (
        <Grid container spacing={2} justifyContent="center" alignItems="center" style={{ minHeight: "100vh" }}>
          <Grid>
            <CircularProgress />
          </Grid>
        </Grid>
      ) : (
        <Grid container spacing={2} size={12}>
          {isDelegatedToSafeSingleton && (
            <Grid>
              <Alert severity="success">
                <Typography color="primary">This account is delegated to Safe Singleton</Typography>
              </Alert>
            </Grid>
          )}
          <Grid container size={12}>
            <Grid size={4}>
              <Typography>Safe Singleton</Typography>
            </Grid>
            <Grid size={8}>
              <Typography align="left">{safeStorage?.singleton}</Typography>
            </Grid>
          </Grid>
          <Grid container size={12}>
            <Grid size={4}>
              <Typography>Fallbackhandler</Typography>
            </Grid>
            <Grid size={8}>
              <Typography align="left">{safeStorage?.fallbackHandler}</Typography>
            </Grid>
          </Grid>
          <Grid container size={12}>
            <Grid size={4}>
              <Typography>Threshold</Typography>
            </Grid>
            <Grid size={8}>
              <Typography align="left">{safeStorage?.threshold.toString()}</Typography>
            </Grid>
          </Grid>
          <Grid container size={12}>
            <Grid size={4}>
              <Typography>Safe nonce</Typography>
            </Grid>
            <Grid size={8}>
              <Typography align="left">{safeStorage?.nonce.toString()}</Typography>
            </Grid>
          </Grid>
          <Grid container size={12}>
            <Grid size={4}>
              <Typography>Owner count</Typography>
            </Grid>
            <Grid size={8}>
              <Typography align="left">{safeStorage?.ownerCount.toString()}</Typography>
            </Grid>
          </Grid>
          <Grid container size={12}>
            <Grid size={4}>
              <Typography>Delegatee</Typography>
            </Grid>
            <Grid size={8}>
              <Typography align="left">{isDelegated && accountCode ? "0x" + accountCode.slice(8) : ""}</Typography>
            </Grid>
          </Grid>
          <Grid container size={12}>
            <Grid size={4}>
              <Typography>Owners</Typography>
            </Grid>
            <Grid size={8}>
              <Typography align="left">{owners?.map((owner) => <Grid key={owner}>{owner}</Grid>)}</Typography>
            </Grid>
          </Grid>
          <Grid container size={12}>
            <Grid size={4}>
              <Typography>Modules</Typography>
            </Grid>
            <Grid size={8}>
              <Typography align="left">{modules?.map((module) => <Grid key={module}>{module}</Grid>)}</Typography>
            </Grid>
          </Grid>
        </Grid>
      )}
    </Box>
  );
};

export default Settings;
