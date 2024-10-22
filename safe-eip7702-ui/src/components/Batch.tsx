import React from 'react';
import { Button } from '@mui/material';
import { useNavigate } from 'react-router-dom';

const Batch: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div style={{ color: '#00ff00', textAlign: 'center', marginTop: '20px' }}>
      <h1>Batch Section</h1>
      <p>This is the batch section.</p>
      <Button
        variant="contained"
        onClick={() => navigate('/')}
        style={{ marginTop: '20px' }}
      >
        Back
      </Button>
    </div>
  );
};

export default Batch;
