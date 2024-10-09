import React from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import { ThemeProvider } from '@mui/material/styles';
import { CssBaseline } from '@mui/material';
import retroTheme from './theme';
import Delegate from './components/Delegate';
import Batch from './components/Batch';
import Settings from './components/Settings';
import { WalletProvider } from './context/WalletContext';
import NavigationBar from './components/NavigationBar';

const App: React.FC = () => {
  return (
    <WalletProvider>
      <ThemeProvider theme={retroTheme}>
        <CssBaseline />
        <Router>
          <NavigationBar />
          <div style={{ padding: 20 }}>
            <Routes>
              <Route path="/delegate" element={<Delegate />} />
              <Route path="/batch" element={<Batch />} />
              <Route path="/settings" element={<Settings />} />
            </Routes>
          </div>
        </Router>
      </ThemeProvider>
    </WalletProvider>
  );
};

export default App;
