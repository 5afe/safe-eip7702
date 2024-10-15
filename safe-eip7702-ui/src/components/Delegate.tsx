import React, { useContext, useEffect, useState } from "react";
import {
  Abi,
  PrivateKeyAccount,
  createPublicClient,
  createWalletClient,
  encodeFunctionData,
  http,
  isAddress,
  zeroAddress,
} from "viem";
import { config } from "../wagmi";
import { WalletContext } from "../context/WalletContext";
import { safeEIP7702Addresses } from "../safe-eip7702-config/address";
import safeEIP7702Proxy from "../safe-eip7702-config/artifact/SafeEIP7702Proxy.json";
import safeModuleSetup from "../safe-eip7702-config/artifact/SafeModuleSetup.json";
import { Button, Typography, TextField, Box, IconButton, Alert, CircularProgress } from "@mui/material";
import Grid from "@mui/material/Grid2";
import { waitForTransactionReceipt } from "wagmi/actions";
import { eip7702Actions } from "viem/experimental";
import { getProxyAddress } from "../utils/utils";
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import { relayAuthorization } from "../api/api";
import { Link } from "react-router-dom";
import DoneIcon from '@mui/icons-material/Done';

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
  const [owners, setOwners] = useState<string[]>([]);
  const [initData, setInitData] = useState<`0x${string}`>();
  const [isWaitingForTransactionHash, setIsWaitingForTransactionHash] = useState<boolean>(false);
  const [isWaitingForTransactionReceipt, setIsWaitingForTransactionReceipt] = useState<boolean>(false);
  const [transactionHash, setTransactionHash] = useState<`0x${string}`>();
  const [nonce, setNonce] = useState<number>(0);
  const [signed, setSigned] = useState<boolean>(false);
  const [isProxyDeployed, setIsProxyDeployed] = useState<boolean>(false);
  const [delegatee, setDelegatee] = useState<string>();
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>();
  const [canSign, setCanSign] = useState<boolean>(false);

  const proxyFactory = safeEIP7702Addresses[chainId]?.addresses.proxyFactory;

  const calculateInitData = () => {
    if (!chainId || owners.length === 0 || !validateOwners() || threshold > owners.length) return;

    const moduleSetupData = encodeFunctionData({
      abi: safeModuleSetup.abi,
      functionName: "enableModules",
      args: [[safeEIP7702Addresses[chainId].addresses.fallbackHandler]],
    });

    const setupCalldata = encodeFunctionData({
      abi: safeEIP7702Proxy.abi as Abi,
      functionName: "setup",
      args: [
        owners,
        threshold,
        safeEIP7702Addresses[chainId].addresses.moduleSetup,
        moduleSetupData,
        safeEIP7702Addresses[chainId].addresses.fallbackHandler,
        "0x" + "00".repeat(20),
        0,
        "0x" + "00".repeat(20),
      ],
    });

    return setupCalldata;
  };

  const validateOwners = () => owners.every((owner) => isAddress(owner));

  const handleThresholdChange = (event: React.ChangeEvent<HTMLInputElement>) => {
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

  useEffect(() => {
    console.log("Calculating init data");
    const newInitData = calculateInitData() as `0x${string}`;
    setInitData(newInitData);

  }, [threshold, owners]);

  const handleConvertToSmartAccount = async () => {
    setError(undefined);
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
      await waitForTransactionReceipt(config, {
        hash: result.txHash,
      });
      setIsWaitingForTransactionReceipt(false);
    } else {
      setError("Failed to relay authorization");
      console.error("Request to relay authorization failed:", result.error);
    }
    setLoading(false);
  };

  const walletClient = createWalletClient({
    transport: http(safeEIP7702Addresses[chainId].rpc),
  }).extend(eip7702Actions());

  const publicClient = createPublicClient({
    transport: http(safeEIP7702Addresses[chainId].rpc),
  });

  useEffect(() => {
    if (proxyAddress) {
      (async () => {
        console.log("checking proxy code");
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
    if(!proxyAddress || (isWaitingForTransactionHash || isWaitingForTransactionReceipt)) {
      setCanSign(true);
    } else {
      setCanSign(false);
    }
  }, [proxyAddress, isWaitingForTransactionHash, isWaitingForTransactionReceipt]);

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
    }
  };

  const calculateProxyAddress = async () => {
    if (!proxyFactory || !chainId || !initData) return;

    const calculatedProxyAddress = getProxyAddress(
      safeEIP7702Addresses[chainId].addresses.proxyFactory,
      safeEIP7702Addresses[chainId].addresses.safeSingleton,
      initData,
      0n
    );

    setProxyAddress(calculatedProxyAddress);
    if (signed && calculatedProxyAddress !== proxyAddress) {
      setSigned(false);
      setAuthorizations([]);
    }
  };

  useEffect(() => {
    if (proxyFactory && chainId && nonce !== undefined) calculateProxyAddress();
  }, [proxyFactory, chainId, initData]);

  useEffect(() => {
    if (account) {
      (async () => {
        const publicClient = createPublicClient({
          transport: http(safeEIP7702Addresses[chainId].rpc),
        });

        const transactionCount = await publicClient.getTransactionCount({
          address: account.address,
        });
        setNonce(transactionCount);

        setDelegatee(await publicClient.getCode({ address: account.address }));
      })();
    }
  });

  return (
    <Box sx={{ padding: 2 }}>
      <Grid container justifyContent="center">
        <Grid>
          <Typography variant="h4" align="center">
            EIP-7702 Delegate Setup
          </Typography>

          {delegatee ? (
            <Alert severity="warning" variant="standard" sx={{ bgcolor: 'background.paper' }}
              action={
                <Link to={"/settings"}>
                  View storage
                </Link>
              }
            >
              <Typography sx={{ color: "orange" }}>Account already delegated to address: {"0x" + delegatee.slice(8, 14)}...{delegatee.slice(-4)}.</Typography>
            </Alert>
          ) : (
            <Typography align="center">Account not delegated</Typography>
          )}

          <Typography variant="h5" sx={{ marginTop: 2 }} align="center">
            Safe Config
          </Typography>

          <Typography>
            Proxy Factory: {proxyFactory}
          </Typography>

          <Typography>
            Safe Singleton: {safeEIP7702Addresses[chainId]?.addresses.safeSingleton}
          </Typography>

          <Typography>
            Fallback Handler: {safeEIP7702Addresses[chainId]?.addresses.fallbackHandler}
          </Typography>

          <Typography>
            Module Setup: {safeEIP7702Addresses[chainId]?.addresses.moduleSetup}
          </Typography>

          <Typography>
            Module: {safeEIP7702Addresses[chainId]?.addresses.fallbackHandler}
          </Typography>


          <TextField
            label="Threshold"
            type="number"
            value={threshold}
            onChange={handleThresholdChange}
            fullWidth
            margin="normal"
          />

          <Typography variant="h6" sx={{ marginTop: 2 }} align="center">
            Owners
          </Typography>

          {owners.map((owner, index) => (
            <Grid container key={index} spacing={2} alignItems="center">
              <Grid size={10}>
                <TextField
                  fullWidth
                  value={owner}
                  onChange={(e) => handleOwnerChange(index, e.target.value)}
                  placeholder="Enter owner address"
                  margin="normal"
                />
              </Grid>
              <Grid size={2}>
                <IconButton sx={{ color: "grey" }} onClick={() => removeOwner(index)}>
                  <DeleteOutlineIcon />
                </IconButton>
                {/* <Button variant="contained" color="error" onClick={() => removeOwner(index)}>
                  Remove
                </Button> */}
              </Grid>
            </Grid>
          ))}

          <Button variant="contained" onClick={addOwner}>
            Add Owner
          </Button>

          {/* <Typography sx={{ wordBreak: "break-word", marginTop: 2 }}>{initData}</Typography> */}

          {errorMessage && <Typography color="error">{errorMessage}</Typography>}

          {proxyAddress ? (
            <div>
              <Typography variant="body1" align="center">Proxy Address: {proxyAddress}</Typography>
              {isProxyDeployed ? (
                <Typography variant="body1" align="center">Proxy is deployed</Typography>
              ) : (
                <Typography variant="body1" align="center">Proxy is not deployed</Typography>
              )}
            </div>
          ) : (
            <Typography variant="body1" align="center">Proxy address not calculated</Typography>
          )}

          <Typography color="primary" align="center">ChainID: {chainId}</Typography>

          <TextField
            label="Nonce"
            type="number"
            value={nonce}
            onChange={(e) => setNonce(parseInt(e.target.value))}
            fullWidth
            margin="normal"
          />

          <Button variant="contained" 
            disabled={canSign}
            onClick={() => handleSignAuthorization(chainId)}
            sx={{ marginTop: 2 }}
            fullWidth
            endIcon={authorizations.length > 0 ? <DoneIcon />: null}
          >
            {authorizations.length === 0 ?  "Sign Authorization": "Already signed. Sign again"}
          </Button>

          <Button variant="contained" disabled={authorizations.length === 0 || (isWaitingForTransactionHash || isWaitingForTransactionReceipt)} onClick={handleConvertToSmartAccount} sx={{ marginTop: 2 }} fullWidth>
              Convert to smart account {error ? "(Try again)" : null}
          </Button>

          {transactionHash && (
            <Typography align="center">Transaction hash: {transactionHash}</Typography>
          )}

          {(isWaitingForTransactionHash || isWaitingForTransactionReceipt) ? (
            <Typography align="center">Waiting for transaction to confirm</Typography>
          ) : null}

          {
            loading && <CircularProgress />
          }
          {error && <Alert severity="error" sx={{ bgcolor: 'background.paper' }}>
            <Typography sx={{ color: "red" }}>{error}</Typography>
          </Alert>}
        </Grid>
      </Grid>
    </Box>
  );
}

export default Delegate;
