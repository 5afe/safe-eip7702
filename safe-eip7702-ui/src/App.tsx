import React from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import { ThemeProvider } from '@mui/material/styles';
import { Container, CssBaseline } from '@mui/material';
import Delegate from './components/Delegate';
import Settings from './components/Settings';
import Home from './components/Home';
import { WalletProvider } from './context/WalletContext';
import NavigationBar from './components/NavigationBar';
import SafeThemeProvider from './theme/SafeThemeProvider';

const App: React.FC = () => {
  return (
    <WalletProvider>
      <SafeThemeProvider mode="dark">
        {(safeTheme) => (
          <>
           <ThemeProvider theme={safeTheme}>
            <CssBaseline />
            <Router>
              <NavigationBar />
              <Container maxWidth="md">
                <Routes>
                  <Route path="/delegate" element={<Delegate />} />
                  <Route path="/settings" element={<Settings />} />
                  <Route path="/" element={<Home />} />
                </Routes>
              </Container>
            </Router>
            </ThemeProvider>
          </>
        )}
      </SafeThemeProvider>
    </WalletProvider>
  );
};

export default App;
