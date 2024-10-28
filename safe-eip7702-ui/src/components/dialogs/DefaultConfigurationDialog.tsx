import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
} from '@mui/material';
import Grid from "@mui/material/Grid2";

interface DefaultConfigurationDialogProps {
  open: boolean;
  onClose: () => void;
  proxyFactory: string;
  safeSingleton: string;
  fallbackHandler: string;
  moduleSetup: string;
  chainId: number;
  proxyCreationSalt: bigint;
  nonce: number;
}

const DefaultConfigurationDialog: React.FC<DefaultConfigurationDialogProps> = ({
  open,
  onClose,
  proxyFactory,
  safeSingleton,
  fallbackHandler,
  moduleSetup,
  chainId,
  proxyCreationSalt,
  nonce,
}) => {
  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth id="dialog-default-configuration">
      <DialogTitle>Delegation Config</DialogTitle>
      <DialogContent>
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
              <Typography align="left">{safeSingleton}</Typography>
            </Grid>
          </Grid>

          <Grid container size={12}>
            <Grid size={4}>
              <Typography>Fallback Handler</Typography>
            </Grid>
            <Grid size={8}>
              <Typography align="left">{fallbackHandler}</Typography>
            </Grid>
          </Grid>

          <Grid container size={12}>
            <Grid size={4}>
              <Typography>Module Setup</Typography>
            </Grid>
            <Grid size={8}>
              <Typography align="left">{moduleSetup}</Typography>
            </Grid>
          </Grid>

          <Grid container size={12}>
            <Grid size={4}>
              <Typography>Module</Typography>
            </Grid>
            <Grid size={8}>
              <Typography align="left">{fallbackHandler}</Typography>
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
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} color="primary">
          Close
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default DefaultConfigurationDialog;