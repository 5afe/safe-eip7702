import React, { useContext, useEffect } from "react";
import { Alert, Box, CircularProgress, Typography } from "@mui/material";
import Grid from "@mui/material/Grid2";
import { WalletContext } from "../context/WalletContext";
import { readStorage, SafeStorage, SENTINEL_ADDRESS } from "../utils/storageReader";
import { createPublicClient, getContract, http, isAddressEqual } from "viem";
import { safeEIP7702Config } from "../safe-eip7702-config/config";
import { ACCOUNT_CODE_PREFIX } from "../utils/utils";
import safeArtifact from "../safe-eip7702-config/artifact/Safe.json";

const Settings: React.FC = () => {
  const { account, chainId } = useContext(WalletContext)!;
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

  useEffect(() => {
    (async () => {
      if (!account) return;
      setLoading(true);
      const storage = await readStorage(publicClient, account.address);
      const accountCode = await publicClient.getCode({ address: account.address });

      if (accountCode && accountCode.startsWith(ACCOUNT_CODE_PREFIX)) {
        setIsDelegated(true);
      }

      if (isAddressEqual(storage.singleton, safeEIP7702Config[chainId].addresses.safeSingleton)) {
        setIsDelegatedToSafeSingleton(true);

        const contract = getContract({
          address: account.address,
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
    })();
  }, []);

  return (
    <Box id="settings-gird-container">
      <Grid>
        <Typography variant="h4">Account storage</Typography>
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
