import { createTheme } from '@mui/material/styles';

const retroGreen = 'rgb(18, 255, 128)'; // Define your retro green color
const disabledGray = '#808080'; // Gray color for disabled buttons

const retroTheme = createTheme({
  palette: {
    primary: {
      main: retroGreen, // Use the neon green as the primary color
    },
    secondary: {
      main: '#00ffff', // Cyan for secondary color
    },
    background: {
      default: '#000000', // Black background for retro feel
      paper: '#222222', // Slightly lighter black for contrast
    },
    text: {
      primary: retroGreen, // Use retro green for primary text color
      secondary: '#ffffff', // White for secondary text color
    },
  },
  typography: {
    fontFamily: '"Press Start 2P", "Courier New", monospace', // Pixelated retro font
    fontSize: 14,
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 0, // Sharp edges for the retro button
          color: '#000000', // Change button text color to black
          backgroundColor: retroGreen, // Button background in retro green
          '&:hover': {
            backgroundColor: 'rgba(18, 255, 128, 0.8)', // Slightly darker on hover
          },
          '&:disabled': {
            backgroundColor: disabledGray, // Set disabled button background to gray
            color: '#ffffff', // Optionally, change text color when disabled
          },
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          backgroundColor: '#222222', // Dark background for cards
          border: `2px solid ${retroGreen}`, // Retro green border for the cards
        },
      },
    },
    MuiInputBase: {
      styleOverrides: {
        root: {
          color: retroGreen, // Green text in input fields
          backgroundColor: '#000', // Black input background for retro feel
          border: `2px solid ${retroGreen}`, // Green border for input fields
        },
      },
    },
  },
});

export default retroTheme;
