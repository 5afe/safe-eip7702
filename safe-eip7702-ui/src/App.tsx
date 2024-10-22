import React from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import { ThemeProvider } from '@mui/material/styles';
import { Container, CssBaseline } from '@mui/material';
import retroTheme from './theme';
import Delegate from './components/Delegate';
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
          <Container maxWidth="md">
            <Routes>
              <Route path="/delegate" element={<Delegate />} />
              <Route path="/settings" element={<Settings />} />
            </Routes>
          </Container>
        </Router>
      </ThemeProvider>
    </WalletProvider>
  );
};

export default App;
