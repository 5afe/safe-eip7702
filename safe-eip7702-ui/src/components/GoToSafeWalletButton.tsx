import React from 'react';
import { Button } from '@mui/material';

interface GoToSafeWalletButtonProps {
  accountAddress: string | undefined;
}

const GoToSafeWalletButton: React.FC<GoToSafeWalletButtonProps> = ({ accountAddress }) => {
  return (
      <Button
        fullWidth
        variant="contained"
        onClick={() => window.open(`${import.meta.env.VITE_SAFE_UI_URL}/home?safe=${accountAddress}`, '_blank')}
      >
        Go to Safe Wallet
      </Button>
  );
};

export default GoToSafeWalletButton;