import React, { useContext, useState } from 'react';
import { createPimlicoClient } from "permissionless/clients/pimlico";
import { Button, Typography, TextField, IconButton, Card, CardContent, CardActions, Dialog, DialogContent, DialogTitle, CircularProgress, Alert } from '@mui/material';
import Grid from "@mui/material/Grid2";
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import { WalletContext } from '../context/WalletContext';
import { FEATURES, safeEIP7702Config } from '../safe-eip7702-config/config';
import { createPublicClient, Hex, http, isAddress, isHex, zeroAddress } from 'viem';
import { toSafeSmartAccount } from 'permissionless/accounts';
import { createSmartAccountClient } from 'permissionless';
import { odysseyTestnet } from "viem/chains"
import { UserOperationCall } from 'viem/account-abstraction';

enum BatchError {
  SAFE_OWNER_NOT_CONNECTED = "Safe owner not connected",
  MISSING_PIMLICO_API_KEY = "Missing Pimlico API Key"
}

const Batch: React.FC = () => {
  const { features, chainId, publicClient, account, safeStorage } = useContext(WalletContext)!;
  const [transactions, setTransactions] = useState<UserOperationCall[]>([{ to: zeroAddress, value: BigInt(0), data: '0x' }]);
  const [loading, setLoading] = useState<boolean>(false);
  const [errors, setErrors] = useState<BatchError[]>([]);
  const [dialogOpen, setDialogOpen] = useState<boolean>(false);
  const [transactionUrl, setTransactionUrl] = useState<string | null>(null);

  const handleExecute = async () => {
    setLoading(true);
    setDialogOpen(true);

    const pimlicoApiKey = import.meta.env.VITE_PIMLICO_API_KEY as Hex | undefined
    if (!pimlicoApiKey) {
      setErrors([...errors, BatchError.MISSING_PIMLICO_API_KEY]);
      throw new Error("PIMLICO_API_KEY is required")
    }

    const pimlicoUrl = `https://api.pimlico.io/v2/${chainId}/rpc?apikey=${pimlicoApiKey}`

    const pimlicoClient = createPimlicoClient({
      transport: http(pimlicoUrl),
    })

    const publicClient = createPublicClient({
      chain: odysseyTestnet,
      transport: http("https://odyssey.ithaca.xyz"),
    })

    if (safeStorage && safeStorage.owners && account && safeStorage.owners.includes(account.address) && safeStorage.threshold === 1n) {
      const safeAccount = await toSafeSmartAccount({
        address: account?.address,
        owners: [account],
        client: publicClient,
        version: "1.4.1",
      })

      const smartAccountClient = createSmartAccountClient({
        account: safeAccount,
        paymaster: pimlicoClient,
        bundlerTransport: http(pimlicoUrl),
        userOperation: {
          estimateFeesPerGas: async () => (await pimlicoClient.getUserOperationGasPrice()).fast,
        },
      })

      const userOperationHash = await smartAccountClient.sendUserOperation({
        calls: transactions
      })

      const { receipt } = await smartAccountClient.waitForUserOperationReceipt({
        hash: userOperationHash,
      })

      const url = `${safeEIP7702Config[chainId].explorer}/tx/${receipt.transactionHash}`;
      setTransactionUrl(url);
      console.log(`UserOperation included: ${url}`);
    } else {
      console.error(`Safe owner for account [${account?.address}] is not the connected account`)
    }

    setLoading(false);
  }

  const handleAddTransaction = () => {
    setTransactions([...transactions, { to: zeroAddress, value: BigInt(0), data: '0x' }]);
  };

  const handleRemoveTransaction = (index: number) => {
    const newTransactions = transactions.filter((_, i) => i !== index);
    setTransactions(newTransactions);
  };

  const handleTransactionChange = (index: number, field: keyof UserOperationCall, value: string) => {
    const newTransactions = [...transactions];
    if (field === 'value') {
      newTransactions[index][field] = BigInt(value);
    } else {
      newTransactions[index][field] = value as `0x${string}`;
    }
    setTransactions(newTransactions);
  };

  return (
    <Grid container spacing={2}>
      <Grid size={12}>
        <Typography variant="h1" align="left" fontSize={[44, null, 52]} sx={{ marginTop: 5 }}>
          Batch and relay
        </Typography>
      </Grid>

      {transactions.map((transaction, index) => (
        <Grid size={12} key={index}>
          <Card>
            <CardContent>
              <Grid container spacing={2}>
                <Grid size={8}>
                  <TextField
                    label="To"
                    value={transaction.to}
                    onChange={(e) => handleTransactionChange(index, 'to', e.target.value)}
                    error={!isAddress(transaction.to)}
                    helperText={!isAddress(transaction.to) ? 'Invalid address' : ''}
                    fullWidth
                  />
                </Grid>
                <Grid size={4}>
                  <TextField
                    label="Value"
                    type="number"
                    value={transaction.value?.toString()}
                    onChange={(e) => handleTransactionChange(index, 'value', e.target.value)}
                    fullWidth
                  />
                </Grid>
                <Grid size={12}>
                  <TextField
                    label="Data"
                    value={transaction.data}
                    onChange={(e) => handleTransactionChange(index, 'data', e.target.value)}
                    error={!isHex(transaction.data)}
                    helperText={!isHex(transaction.data) ? 'Invalid hex data' : ''}
                    fullWidth
                  />
                </Grid>
              </Grid>
            </CardContent>
            <CardActions style={{ justifyContent: 'flex-end' }}>
              <IconButton onClick={() => handleRemoveTransaction(index)}>
                <DeleteIcon />
              </IconButton>
            </CardActions>
          </Card>
        </Grid>
      ))}

      <Grid justifyContent="right" alignContent="right">
        <Button
          variant="outlined"
          startIcon={<AddIcon />}
          onClick={handleAddTransaction}
        >
          Add Transaction
        </Button>
      </Grid>

      <Grid size={12}>
        <Button
          fullWidth
          variant="contained"
          onClick={async () => await handleExecute()}
          disabled={!features.includes(FEATURES.SUPPORT_4337) || loading || !(safeStorage && safeStorage.owners && account && safeStorage.owners.includes(account.address) && safeStorage.threshold === 1n)}
          style={{ marginTop: '20px' }}
        >
          Execute
        </Button>
      </Grid>

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)}>
        <DialogTitle>{loading ? "Processing" : <Alert severity='success'>Finished execution</Alert>}
        </DialogTitle>
        <DialogContent>
          <Grid container justifyContent="center" alignItems="center" direction="column" spacing={2}>
            {loading && (
              <Grid>
                <CircularProgress />
              </Grid>
            )}
            {!loading && transactionUrl && (
              <Grid>
                <Button
                  variant="contained"
                  color="primary"
                  onClick={() => window.open(transactionUrl, '_blank')}
                >
                  View Transaction
                </Button>
              </Grid>
            )}
          </Grid>
        </DialogContent>
      </Dialog>
    </Grid>
  );
};

export default Batch;