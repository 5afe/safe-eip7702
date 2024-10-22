import React from 'react';
import { Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle, Button, TextField } from '@mui/material';
import WalletInput from './WalletInput';

interface DisconnectDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

const ChangeAccountDialog: React.FC<DisconnectDialogProps> = ({ open, onClose, onConfirm }) => {
  return (
    <Dialog open={open} onClose={onClose} aria-labelledby="change-account-title">
      <DialogTitle id="change-account-title">
        Change Account
      </DialogTitle>
      <DialogContent>
        <DialogContentText>
            <WalletInput/>
        </DialogContentText>
      </DialogContent>
      <DialogActions>
        {/* <Button onClick={onClose}>
          Cancel
        </Button> */}
        <Button onClick={onConfirm} autoFocus>
          Close
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ChangeAccountDialog;
