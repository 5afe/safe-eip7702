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
import { safeEIP7702Config } from "../safe-eip7702-config/config";
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
} from "@mui/material";
import Grid from "@mui/material/Grid2";
import { eip7702Actions } from "viem/experimental";
import { getProxyAddress, getShortAddress } from "../utils/utils";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import { relayAuthorization } from "../api/api";
import { Link } from "react-router-dom";
import DoneIcon from "@mui/icons-material/Done";
import AddIcon from "@mui/icons-material/Add";

declare global {
  interface BigInt {
    toJSON(): Number;
  }
}

BigInt.prototype.toJSON = function () {
  return Number(this);
};

function Delegate() {
  const { authorizations, chainId, account, setAuthorizations } = useContext(WalletContext)!;

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

  const proxyFactory = safeEIP7702Config[chainId]?.addresses.proxyFactory;

  useEffect(() => {
    const newInitData = calculateInitData() as `0x${string}`;
    setInitData(newInitData);
  }, [threshold, owners]);

  useEffect(() => {
    if (!proxyAddress || isWaitingForTransactionHash || isWaitingForTransactionReceipt) {
      setCanSign(true);
    } else {
      setCanSign(false);
    }
  }, [proxyAddress, isWaitingForTransactionHash, isWaitingForTransactionReceipt]);

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
        const publicClient = createPublicClient({
          transport: http(safeEIP7702Config[chainId].rpc),
        });

        const transactionCount = await publicClient.getTransactionCount({
          address: account.address,
        });
        setNonce(transactionCount);

        setDelegatee(await publicClient.getCode({ address: account.address }));
      })();
    }
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

      const publicClient = createPublicClient({
        transport: http(safeEIP7702Config[chainId].rpc),
      });

      try {
        await publicClient.waitForTransactionReceipt({
          hash: result.txHash,
          pollingInterval: parseInt(import.meta.env.VITE_TRANSACTION_POOLING_INTERVAL) || 12_000,
        });
        setSuccess(true);
      } catch (e) {
        setError("Failed to execute transaction");
      }
      setIsWaitingForTransactionReceipt(false);
    } else {
      setError("Failed to relay authorization");
      console.error("Request to relay authorization failed:", result.error);
    }
    setLoading(false);
  };

  const walletClient = createWalletClient({
    transport: http(safeEIP7702Config[chainId].rpc),
  }).extend(eip7702Actions());

  const publicClient = createPublicClient({
    transport: http(safeEIP7702Config[chainId].rpc),
  });

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

  return (
    <Box>
      <Typography variant="h3" align="left">
        EIP-7702 Delegate Setup
      </Typography>

      <Typography variant="h4" sx={{ marginTop: 2 }}>
        Delegation Config
      </Typography>

      <Grid container size={12}>
        <Grid container size={12}>
          <Grid size={4}>
            <Typography>Proxy Factory</Typography>
          </Grid>
          <Grid size={8}>
            <Typography align="left">{proxyFactory}</Typography>
          </Grid>
        </Grid>

        <Grid container size={12}>
          <Grid size={4}>
            <Typography>Safe Singleton</Typography>
          </Grid>
          <Grid size={8}>
            <Typography align="left">{safeEIP7702Config[chainId]?.addresses.safeSingleton}</Typography>
          </Grid>
        </Grid>

        <Grid container size={12}>
          <Grid size={4}>
            <Typography>Fallback Handler</Typography>
          </Grid>
          <Grid size={8}>
            <Typography align="left">{safeEIP7702Config[chainId]?.addresses.fallbackHandler}</Typography>
          </Grid>
        </Grid>

        <Grid container size={12}>
          <Grid size={4}>
            <Typography>Module Setup</Typography>
          </Grid>
          <Grid size={8}>
            <Typography align="left">{safeEIP7702Config[chainId]?.addresses.moduleSetup}</Typography>
          </Grid>
        </Grid>

        <Grid container size={12}>
          <Grid size={4}>
            <Typography>Module</Typography>
          </Grid>
          <Grid size={8}>
            <Typography align="left">{safeEIP7702Config[chainId]?.addresses.fallbackHandler}</Typography>
          </Grid>
        </Grid>

        <Grid container size={12}>
          <Grid size={4}>
            <Typography>ChainID</Typography>
          </Grid>
          <Grid size={8}>
            <Typography align="left">{chainId}</Typography>
          </Grid>
        </Grid>

        <Grid container size={12}>
          <Grid size={4}>
            <Typography>Proxy Creation Salt</Typography>
          </Grid>
          <Grid size={8}>
            <Typography align="left">{proxyCreationSalt.toString()}</Typography>
          </Grid>
        </Grid>

        <Grid container size={12}>
          <Grid size={4}>
            <Typography>EOA nonce</Typography>
          </Grid>
          <Grid size={8}>
            <Typography align="left">{nonce}</Typography>
          </Grid>
        </Grid>
      </Grid>

      <Typography variant="h4" sx={{ marginTop: 2 }}>
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

      <Typography variant="h4" sx={{ marginTop: 3 }}>
        Threshold
      </Typography>

      <Grid container>
        <Grid>
          <Select value={threshold.toString()} onChange={handleThresholdChange} sx={{ border: "1px solid #ced4da" }}>
            {owners.map((owner, index) => (
              <MenuItem key={owner} value={index + 1}>
                {index + 1}
              </MenuItem>
            ))}
          </Select>
        </Grid>
      </Grid>

      {errorMessage && <Typography color="error">{errorMessage}</Typography>}

      {proxyAddress ? (
        <div>
          {isProxyDeployed ? (
            <Alert>
              <Typography color="primary">Proxy {getShortAddress(proxyAddress)} already deployed</Typography>
            </Alert>
          ) : (
            <Alert severity="info" sx={{ marginTop: 2 }}>
              <Typography color="primary">
                Proxy {getShortAddress(proxyAddress)} is not deployed. Relayer will deploy it.
              </Typography>
            </Alert>
          )}
        </div>
      ) : null}

      {delegatee ? (
        <Alert severity="warning" sx={{ marginTop: 2 }} action={<Link to={"/settings"}>View storage</Link>}>
          <Typography sx={{ color: "orange" }}>
            Account already delegated to address: {getShortAddress(("0x" + delegatee.slice(8)) as `0x${string}`)}.
            EOA storage will not be initialized if it is already setup.
          </Typography>
        </Alert>
      ) : (
        <Typography align="center">Account not delegated</Typography>
      )}

      <Button
        variant="contained"
        disabled={canSign || authorizations.length > 0}
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

      {transactionHash && (
        <Typography align="center">
          Transaction hash:{" "}
          <Link target="_blank" rel="noreferrer" to={`${safeEIP7702Config[chainId].explorer}/tx/${transactionHash}`}>
            {transactionHash}
          </Link>
        </Typography>
      )}

      {isWaitingForTransactionHash || isWaitingForTransactionReceipt ? (
        <Typography align="center">Waiting for transaction to confirm</Typography>
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
        <Alert severity="success">
          <Typography sx={{ color: "green" }}>Transaction executed</Typography>
        </Alert>
      )}
    </Box>
  );
}

export default Delegate;
