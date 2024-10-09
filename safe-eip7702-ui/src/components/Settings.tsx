import React from 'react';
import { Button } from '@mui/material';
import { useNavigate } from 'react-router-dom';

const Settings: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div style={{ color: '#00ff00', textAlign: 'center', marginTop: '20px' }}>
      <h1>Settings Section</h1>
      <p>This is the settings section.</p>
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

export default Settings;
