import React, { useContext, useEffect, useState } from "react";
import { AppBar, Toolbar, Button, Typography, Box, IconButton, MenuItem, Menu, Tooltip } from "@mui/material";
import { Link } from "react-router-dom";
import { WalletContext } from "../context/WalletContext";
import ChangeAccountDialog from "./dialogs/ChangeAccountDialog";
import { safeEIP7702Config } from "../safe-eip7702-config/config";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import ErrorIcon from "@mui/icons-material/Error";
import { checkRPCStatus } from "../api/api";

const NavigationBar: React.FC = () => {
  const { isPrivateKeyValid, account, chainId, setChainId } = useContext(WalletContext)!;
  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);
  const [chainMenuAnchorEl, setChainMenuAnchorEl] = React.useState<null | HTMLElement>(null); // State for chain selection menu
  const open = Boolean(anchorEl);
  const chainMenuOpen = Boolean(chainMenuAnchorEl);
  const [disconnectDialogOpen, setDisconnectDialogOpen] = useState(false); // State for controlling the dialog
  const [connected, setConnected] = useState(false);

  // Handle main menu open/close
  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  // Handle chain menu open/close
  const handleChainMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setChainMenuAnchorEl(event.currentTarget);
  };

  const handleChainMenuClose = () => {
    setChainMenuAnchorEl(null);
  };

  const handleChainSelect = (selectedChainId: string) => {
    setChainId(parseInt(selectedChainId)); // Update the selected chainId in context
    handleChainMenuClose(); // Close the chain selection menu
  };

  const handleChangeClick = () => {
    handleMenuClose(); // Close the menu first
    setDisconnectDialogOpen(true); // Open the dialog
  };

  const handleDisconnectConfirm = () => {
    setDisconnectDialogOpen(false);
  };

  useEffect(() => {
    (async () => {
      const rpcUrl = safeEIP7702Config[chainId].rpc;
      const isLive = await checkRPCStatus(rpcUrl);
      setConnected(isLive);
    })();
  }, [chainId]);

  return (
    <AppBar position="static" sx={{ borderBottom: "2px solid rgb(18, 255, 128)" }}>
      <Toolbar sx={{ justifyContent: "space-between" }}>
        {/* Left Section: App Name and Buttons */}
        <Box sx={{ display: "flex", alignItems: "center" }}>
          <Typography
            variant="h6"
            sx={{ marginRight: 4 }}
          >
            EOA--&gt;Safe
          </Typography>

          <Button
            component={Link}
            to="/delegate"
            variant="contained"
            disabled={!isPrivateKeyValid}
            sx={{
              marginRight: 2,
            }}
          >
            Delegate
          </Button>

          <Button
            component={Link}
            variant="contained"
            to="/settings"
            disabled={!isPrivateKeyValid}
            sx={{
              marginRight: 2,
            }}
          >
            View Storage
          </Button>
        </Box>

        {/* Right Section: Account Info and Dropdown */}
        <Box>
          {/* Chain ID Selection Menu */}
          <IconButton onClick={handleChainMenuOpen} color="inherit">
            {connected ? (
              <Tooltip title="connected">
                <CheckCircleOutlineIcon color="success" sx={{ marginRight: "5px" }} />
              </Tooltip>
            ) : (
              <Tooltip title="Error connecting to rpc">
                <ErrorIcon color="error" sx={{ marginRight: "5px" }} />
              </Tooltip>
            )}
            <Typography color="primary">{safeEIP7702Config[chainId]?.name}</Typography>
          </IconButton>
          <Menu anchorEl={chainMenuAnchorEl} open={chainMenuOpen} onClose={handleChainMenuClose}>
            {Object.keys(safeEIP7702Config).map((chain) => (
              <MenuItem key={chain} onClick={() => handleChainSelect(chain)}>
                {safeEIP7702Config[chain].name} ({chain})
              </MenuItem>
            ))}
          </Menu>

          {/* Account Info Menu */}
          <IconButton onClick={handleMenuOpen} color="inherit">
            <Typography color="primary">
              {account?.address.slice(0, 6)}...{account?.address.slice(-4)}
            </Typography>
          </IconButton>
          <Menu anchorEl={anchorEl} open={open} onClose={handleChangeClick}>
            <MenuItem onClick={handleChangeClick}>Change</MenuItem>
          </Menu>
        </Box>
      </Toolbar>

      <ChangeAccountDialog
        open={disconnectDialogOpen}
        onClose={() => setDisconnectDialogOpen(false)}
        onConfirm={handleDisconnectConfirm}
      />
    </AppBar>
  );
};

export default NavigationBar;
