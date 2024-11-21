import { useContext, useEffect, useState } from "react";
import {
  Abi,
  PrivateKeyAccount,
  createPublicClient,
  createWalletClient,
  encodeFunctionData,
  http,
  isAddress,
  isAddressEqual,
  zeroAddress,
} from "viem";
import { WalletContext } from "../context/WalletContext";
import { FEATURES, safeEIP7702Config } from "../safe-eip7702-config/config";
import safeEIP7702Proxy from "../safe-eip7702-config/artifact/SafeEIP7702Proxy.json";
import safeModuleSetup from "../safe-eip7702-config/artifact/SafeModuleSetup.json";
import {
  Button,
  Typography,
  TextField,
  IconButton,
  Alert,
  CircularProgress,
  MenuItem,
  Select,
  SelectChangeEvent,
  Box,
  Tooltip,
  Dialog,
} from "@mui/material";
import Grid from "@mui/material/Grid2";
import { eip7702Actions } from "viem/experimental";
import { ACCOUNT_CODE_PREFIX, getProxyAddress, getShortAddress, getShortTransactionHash } from "../utils/utils";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import { relayAuthorization } from "../api/api";
import { Link } from "react-router-dom";
import DoneIcon from "@mui/icons-material/Done";
import AddIcon from "@mui/icons-material/Add";
import InfoOutlined from '@mui/icons-material/InfoOutlined';
import DefaultConfigurationDialog from "./dialogs/DefaultConfigurationDialog";
import GoToSafeWalletButton from './GoToSafeWalletButton';

declare global {
  interface BigInt {
    toJSON(): Number;
  }
}

BigInt.prototype.toJSON = function () {
  return Number(this);
};

function Delegate() {
  const { loadStorage, features, authorizations, chainId, account, setAuthorizations, safeStorage } = useContext(WalletContext)!;

  const [proxyAddress, setProxyAddress] = useState<`0x${string}`>();
  const [errorMessage, setErrorMessage] = useState<string>();
  const [threshold, setThreshold] = useState<number>(1);
  const [owners, setOwners] = useState<string[]>([account?.address || ""]);
  const [initData, setInitData] = useState<`0x${string}`>();
  const [isWaitingForTransactionHash, setIsWaitingForTransactionHash] = useState<boolean>(false);
  const [isWaitingForTransactionReceipt, setIsWaitingForTransactionReceipt] = useState<boolean>(false);
  const [transactionHash, setTransactionHash] = useState<`0x${string}`>();
  const [proxyCreationSalt, setProxyCreationSalt] = useState<bigint>(0n);
  const [nonce, setNonce] = useState<number>(0);
  const [signed, setSigned] = useState<boolean>(false);
  const [isProxyDeployed, setIsProxyDeployed] = useState<boolean>(false);
  const [delegatee, setDelegatee] = useState<string>();
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>();
  const [canSign, setCanSign] = useState<boolean>(false);
  const [success, setSuccess] = useState<boolean>(false);
  const [openDialog, setOpenDialog] = useState<boolean>(false);
  const [openDialogTransactionStatus, setOpenDialogTransactionStatus] = useState<boolean>(false);

  const proxyFactory = safeEIP7702Config[chainId]?.addresses.proxyFactory;

  const isDelegatedToSafeAccount = () => {
    return delegatee && safeStorage && safeStorage.singleton && isAddressEqual(safeEIP7702Config[chainId].addresses.safeSingleton, safeStorage.singleton);
  }
  useEffect(() => {
    setInitData(calculateInitData() as `0x${string}`);
  }, [threshold, owners]);

  useEffect(() => {
    if (proxyAddress === undefined || isWaitingForTransactionHash || isWaitingForTransactionReceipt || authorizations.length > 0 || delegatee !== undefined) {
      setCanSign(false);
    } else {
      setCanSign(true);
    }
  }, [proxyAddress, isWaitingForTransactionHash, isWaitingForTransactionReceipt, authorizations, delegatee]);

  useEffect(() => {
    if (proxyAddress) {
      (async () => {
        const proxyCode = await publicClient.getCode({ address: proxyAddress });
        if (proxyCode) {
          setIsProxyDeployed(true);
        } else {
          setIsProxyDeployed(false);
        }
      })();
    }
  }, [proxyAddress]);

  useEffect(() => {
    if (proxyFactory && chainId && nonce !== undefined) calculateProxyAddress();
  }, [proxyFactory, chainId, initData]);

  useEffect(() => {
    if (account) {
      (async () => {

        setOwners([account?.address]);
        setThreshold(1);
        setInitData(calculateInitData() as `0x${string}`);

        try {
          const publicClient = createPublicClient({
            transport: http(safeEIP7702Config[chainId].rpc),
          });

          const transactionCount = await publicClient.getTransactionCount({
            address: account.address,
          });
          setNonce(transactionCount);

          const accountCode = await publicClient.getCode({ address: account.address });
          if (accountCode && accountCode.startsWith(ACCOUNT_CODE_PREFIX)) {
            setDelegatee(accountCode);
          } else {
            setDelegatee(undefined);
          }

        } catch (e) {
          console.error("RPC error", e);
        }
      })();
    }
  }, [account]);

  const walletClient = createWalletClient({
    transport: http(safeEIP7702Config[chainId].rpc),
  }).extend(eip7702Actions());

  const publicClient = createPublicClient({
    transport: http(safeEIP7702Config[chainId].rpc),
  });

  const validateOwners = (): boolean => {
    const uniqueOwners = new Set(owners);
    return uniqueOwners.size === owners.length && owners.every((owner) => isAddress(owner));
  };

  const handleThresholdChange = (event: SelectChangeEvent) => {
    const value = parseInt(event.target.value, 10);
    if (!isNaN(value) && value > 0) setThreshold(value);
    else alert("Threshold must be a positive number.");
  };

  const handleOwnerChange = (index: number, value: string) => {
    const updatedOwners = [...owners];
    updatedOwners[index] = value;
    setOwners(updatedOwners);
  };

  const addOwner = () => setOwners([...owners, ""]);

  const removeOwner = (index: number) => {
    const updatedOwners = owners.filter((_, i) => i !== index);
    setOwners(updatedOwners);
  };

  const calculateInitData = () => {
    if (!chainId || owners.length === 0 || !validateOwners() || threshold > owners.length) return;

    const moduleSetupData = encodeFunctionData({
      abi: safeModuleSetup.abi,
      functionName: "enableModules",
      args: [[safeEIP7702Config[chainId].addresses.fallbackHandler]],
    });

    const setupCalldata = encodeFunctionData({
      abi: safeEIP7702Proxy.abi as Abi,
      functionName: "setup",
      args: [
        owners,
        threshold,
        safeEIP7702Config[chainId].addresses.moduleSetup,
        moduleSetupData,
        safeEIP7702Config[chainId].addresses.fallbackHandler,
        "0x" + "00".repeat(20),
        0,
        "0x" + "00".repeat(20),
      ],
    });

    return setupCalldata;
  };

  const handleConvertToSmartAccount = async () => {
    setOpenDialogTransactionStatus(true);
    setError(undefined);
    setSuccess(false);

    if (!authorizations.length) {
      setErrorMessage("Authorization not signed");
      return;
    }

    setLoading(true);
    setIsWaitingForTransactionHash(true);

    const result = await relayAuthorization(authorizations, initData, proxyFactory, account?.address || zeroAddress);

    setIsWaitingForTransactionHash(false);

    if (result.txHash) {
      setTransactionHash(result.txHash);
      setIsWaitingForTransactionReceipt(true);
      try {
        const transactionReceipt = await publicClient.waitForTransactionReceipt({
          hash: result.txHash,
          pollingInterval: parseInt(import.meta.env.VITE_TRANSACTION_POOLING_INTERVAL) || 12_000,
        });
        console.log("Transaction receipt", transactionReceipt);

        if (transactionReceipt.status === "success") {
          setSuccess(true);
        } else {
          setError("Transaction failed");
          setSuccess(false);
        }
      } catch (e) {
        console.error("Failed to execute transaction", e);
        setError("Failed to execute transaction");
      }
      await loadStorage();
      setIsWaitingForTransactionReceipt(false);
    } else {
      setError("Failed to relay authorization");
      console.error("Request to relay authorization failed:", result.error);
    }
    setLoading(false);
  };

  const handleSignAuthorization = async (chainId: number) => {
    if (account && proxyAddress) {
      const authorization = await walletClient.signAuthorization({
        account: account as PrivateKeyAccount,
        contractAddress: proxyAddress,
        nonce: nonce,
        chainId: chainId,
      });

      setAuthorizations([authorization]);
      setSigned(true);
      setSuccess(false);
    }
  };

  const calculateProxyAddress = async () => {
    if (!proxyFactory || !chainId || !initData) {
      setProxyAddress(undefined);
      setSigned(false);
      setAuthorizations([]);
      return;
    }

    const calculatedProxyAddress = getProxyAddress(
      safeEIP7702Config[chainId].addresses.proxyFactory,
      safeEIP7702Config[chainId].addresses.safeSingleton,
      initData,
      proxyCreationSalt
    );

    setProxyAddress(calculatedProxyAddress);
    if (signed && calculatedProxyAddress !== proxyAddress) {
      setSigned(false);
      setAuthorizations([]);
    }
  };

  const handleOpenDialog = () => {
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
  };

  return (
    <Box>
      <Typography variant="h1" align="left" fontSize={[44, null, 52]} sx={{ marginTop: 5 }}>
        Account Setup
      </Typography>

      <Typography fontSize={[20, null, 20]} sx={{ marginTop: 2 }}>
        Owners
      </Typography>

      <Grid container size={12}>
        {owners.map((owner, index) => (
          <Grid size={12} container key={index} spacing={2} alignItems="center">
            <Grid size={10}>
              <TextField
                fullWidth
                label={`Signer ${index + 1} ${account?.address && isAddress(owner) && isAddressEqual(owner as `0x${string}`, account?.address) ? "(Connected EOA address)" : ""}`}
                value={owner}
                onChange={(e) => handleOwnerChange(index, e.target.value)}
                placeholder="Enter singer address"
                margin="normal"
                error={!isAddress(owner) || owners.indexOf(owner) !== owners.lastIndexOf(owner)}
                helperText={
                  (!isAddress(owner) && "Invalid address") ||
                  (owners.indexOf(owner) !== owners.lastIndexOf(owner) && "Duplicate singer address")
                }
                sx={{
                  '& .MuiInputBase-input': {
                    fontFamily: 'monospace',
                  },
                }}
              />
            </Grid>
            <Grid size={2}>
              <IconButton sx={{ color: "grey" }} size="large" onClick={() => removeOwner(index)}>
                <DeleteOutlineIcon />
              </IconButton>
            </Grid>
          </Grid>
        ))}
      </Grid>

      <Button variant="outlined" startIcon={<AddIcon />} onClick={addOwner}>
        Add Signer
      </Button>

      <Typography fontSize={[20, null, 20]} sx={{ marginTop: 2 }}>
        Threshold
      </Typography>

      <Grid sx={{ marginTop: 2 }}>
        <Select value={threshold.toString()} onChange={handleThresholdChange} sx={{ border: "1px solid #ced4da" }}>
          {owners.map((owner, index) => (
            <MenuItem key={owner} value={index + 1}>
              {index + 1}
            </MenuItem>
          ))}
        </Select>
      </Grid>

      <Grid container sx={{ marginTop: "2vh", marginBottom: "2vh" }} onClick={handleOpenDialog}>
        <Grid>
          <Typography sx={{ textDecoration: 'underline', color: 'grey' }}
          >
            View other default configuration
          </Typography>
        </Grid>
        <Grid sx={{ marginLeft: "10px" }}>
          <Tooltip title="Click to view the default configuration details such as contract addresses, chainId and nonce">
            <InfoOutlined sx={{ color: "grey" }} />
          </Tooltip>
        </Grid>
      </Grid>

      <DefaultConfigurationDialog
        open={openDialog}
        onClose={handleCloseDialog}
        proxyFactory={proxyFactory || ""}
        safeSingleton={safeEIP7702Config[chainId]?.addresses.safeSingleton || ""}
        fallbackHandler={safeEIP7702Config[chainId]?.addresses.fallbackHandler || ""}
        moduleSetup={safeEIP7702Config[chainId]?.addresses.moduleSetup || ""}
        chainId={chainId || 0}
        proxyCreationSalt={proxyCreationSalt}
        nonce={nonce}
      />

      {errorMessage && <Typography color="error">{errorMessage}</Typography>}

      {proxyAddress && delegatee === undefined ? (
        <div>
          {isProxyDeployed ? (
            <Alert>
              <Typography>Proxy <Typography component="code" sx={{ fontFamily: 'monospace' }}>{getShortAddress(proxyAddress)}</Typography> already deployed</Typography>
            </Alert>
          ) : (
            <Alert severity="info" sx={{ marginTop: 2 }}>
              <Typography>
                Relayer will deploy proxy at address: <Typography component="code" sx={{ fontFamily: 'monospace' }}>{getShortAddress(proxyAddress)}</Typography>
              </Typography>
            </Alert>
          )}
        </div>
      ) : null}

      {isDelegatedToSafeAccount() && (
        <Alert severity="success" sx={{ marginTop: 2 }} action={<Link to={"/settings"}>View more</Link>}>
          <Typography>
            Account already delegated and uses Safe singleton: <Typography component="code" sx={{ fontFamily: 'monospace' }}>
              {getShortAddress((safeStorage?.singleton || zeroAddress))}
            </Typography>
          </Typography>
        </Alert>
      )}

      {delegatee && !isDelegatedToSafeAccount() && (
        <Alert severity="warning" sx={{ marginTop: 2 }} action={<Link to={"/settings"}>View more</Link>}>
          <Typography>
            Account already delegated to address: <Typography component="code" sx={{ fontFamily: 'monospace' }}>
              {getShortAddress(("0x" + delegatee.slice(8)) as `0x${string}`)}
            </Typography>
          </Typography>
        </Alert>
      )}

      <Button
        variant="contained"
        disabled={!canSign}
        onClick={() => handleSignAuthorization(chainId)}
        sx={{ marginTop: 2 }}
        fullWidth
        endIcon={authorizations.length > 0 ? <DoneIcon /> : null}
      >
        {authorizations.length === 0 ? "Sign Authorization" : "Authorization Signed"}
      </Button>

      <Button
        variant="contained"
        disabled={authorizations.length === 0 || isWaitingForTransactionHash || isWaitingForTransactionReceipt}
        onClick={handleConvertToSmartAccount}
        sx={{ marginTop: 2 }}
        fullWidth
      >
        Convert to smart account {error ? "(Try again)" : null}
      </Button>

      {isDelegatedToSafeAccount() && (
        <Box sx={{ marginTop: 2 }}>
          <GoToSafeWalletButton accountAddress={account?.address} />
        </Box>
      )}

      <Dialog open={openDialogTransactionStatus} onClose={() => setOpenDialogTransactionStatus(false)}>
        <Box sx={{ padding: 2 }}>
          <Grid container justifyContent="center" alignItems="center" size={12} spacing={2}>
            {transactionHash && (
              <Grid size={12}>
                <Typography align="center">
                  Transaction hash:&nbsp;
                  <Link target="_blank" rel="noreferrer" to={`${safeEIP7702Config[chainId].explorer}/tx/${transactionHash}`}>
                    {getShortTransactionHash(transactionHash)}
                  </Link>
                </Typography>
              </Grid>
            )}

            {isWaitingForTransactionHash || isWaitingForTransactionReceipt ? (
              <Grid size={12}>
                <Typography align="center">Waiting for transaction to confirm</Typography>
              </Grid>
            ) : null}

            {loading && (
              <Grid container justifyContent="center">
                <CircularProgress />
              </Grid>
            )}
            {error && (
              <Alert severity="error">
                <Typography sx={{ color: "red" }}>{error}</Typography>
              </Alert>
            )}

            {success && !error && (
              <Grid container size={12}>
                <Grid size={12}>
                  <Alert severity="success">
                    <Typography sx={{ color: "white" }}>Transaction executed. EOA now can be used in Safe wallet.</Typography>
                  </Alert>
                </Grid>
                <Grid container size={12} justifyContent="center" alignItems="center">
                  {
                    features.includes(FEATURES.SAFE_WALLET) &&
                    <Grid size={6}>
                      <GoToSafeWalletButton accountAddress={account?.address} />
                    </Grid>
                  }

                  {
                    features.includes(FEATURES.SUPPORT_4337) &&

                    <Grid size={6}>
                      <Button
                        component={Link}
                        fullWidth
                        variant="contained"
                        to="/batch"
                      >
                        Batch transactions
                      </Button>
                    </Grid>

                  }

                </Grid>
              </Grid>
            )}
          </Grid>
        </Box>
      </Dialog>

      {error && (
        <Alert severity="error">
          <Typography sx={{ color: "red" }}>{error}</Typography>
        </Alert>
      )}

    </Box>
  );
}

export default Delegate;