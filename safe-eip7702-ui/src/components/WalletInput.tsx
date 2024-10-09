import React, { useContext } from 'react';
import { Button, TextField, Typography } from '@mui/material';
import Grid from '@mui/material/Grid2';
import { WalletContext } from '../context/WalletContext';

const WalletInput: React.FC = () => {
  const { privateKey, setPrivateKey, isPrivateKeyValid, account} = useContext(WalletContext)!;

  return (
    <Grid
    container 
    direction="column"
    justifyContent="center"
    alignItems="center"
    component="span"
>
      <Grid container size={12} justifyContent="center" spacing={2}  
      >
        <Grid size={12 }   
        >
          <Typography>Private Key</Typography>
          <TextField
            fullWidth
            required
            value={privateKey}
            onChange={(e) => setPrivateKey(e.target.value as `0x${string}`)}
            variant="outlined"
            placeholder="Private Key"
            error={!isPrivateKeyValid}
          />
        </Grid>
        {/* <Grid>
          <Button
            variant="contained"
            disabled={!isPrivateKeyValid}
            sx={{
              height: '56px',
              marginLeft: 1,
            }}
          >
            Connect
          </Button>
        </Grid> */}
      </Grid>
      
      {!isPrivateKeyValid ?
        <Typography variant="body2" color="red" sx={{ marginTop: 1 }}>
          Private key must start with 0x and be a valid 66-character hexadecimal string.
        </Typography>: 
        <Typography color='primary'>Account: {account?.address}</Typography>
      }
    </Grid>
  );
};

export default WalletInput;
