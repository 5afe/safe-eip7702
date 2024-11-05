import React, { useContext, useState } from 'react';
import { Button, Typography, TextField, IconButton, Card, CardContent, CardActions } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import Grid from "@mui/material/Grid2";
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import { WalletContext } from '../context/WalletContext';
import { FEATURES } from '../safe-eip7702-config/config';

interface Transaction {
  to: string;
  value: bigint;
  data: string;
}

const Batch: React.FC = () => {
  const {features} = useContext(WalletContext)!;
  const [transactions, setTransactions] = useState<Transaction[]>([{ to: '', value: BigInt(0), data: '0x' }]);
  const [loading, setLoading] = useState<boolean>(false);

  const handleExecute = async() => {
      setLoading(true);
      setLoading(false);
  }

  const handleAddTransaction = () => {
    setTransactions([...transactions, { to: '', value: BigInt(0), data: '0x' }]);
  };

  const handleRemoveTransaction = (index: number) => {
    const newTransactions = transactions.filter((_, i) => i !== index);
    setTransactions(newTransactions);
  };

  const handleTransactionChange = (index: number, field: keyof Transaction, value: string) => {
    const newTransactions = [...transactions];
    if (field === 'value') {
      newTransactions[index][field] = BigInt(value);
    } else {
      newTransactions[index][field] = value;
    }
    setTransactions(newTransactions);
  };

  const isValidAddress = (address: string) => {
    return /^0x[a-fA-F0-9]{40}$/.test(address);
  };

  const isValidHex = (data: string) => {
    return /^0x[a-fA-F0-9]*$/.test(data);
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
                    error={!isValidAddress(transaction.to)}
                    helperText={!isValidAddress(transaction.to) ? 'Invalid address' : ''}
                    fullWidth
                  />
                </Grid>
                <Grid size={4}>
                  <TextField
                    label="Value"
                    type="number"
                    value={transaction.value.toString()}
                    onChange={(e) => handleTransactionChange(index, 'value', e.target.value)}
                    fullWidth
                  />
                </Grid>
                <Grid size={12}>
                  <TextField
                    label="Data"
                    value={transaction.data}
                    onChange={(e) => handleTransactionChange(index, 'data', e.target.value)}
                    error={!isValidHex(transaction.data)}
                    helperText={!isValidHex(transaction.data) ? 'Invalid hex data' : ''}
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
          onClick={() => handleExecute()}
          disabled={!features.includes(FEATURES.SUPPORT_4337) || loading}
          style={{ marginTop: '20px' }}
        >
          Execute
        </Button>
      </Grid>
    </Grid>
  );
};

export default Batch;