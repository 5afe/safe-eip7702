import Grid from '@mui/material/Grid2';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import Alert from '@mui/material/Alert';
import { Button } from '@mui/material';
import { Link } from 'react-router-dom';

function Home() {
    return (
        <Grid
            container
            justifyContent="center"
            alignItems="center"
        >
            {/* Title */}
            <Grid container size={12} margin={10}>
                <Grid textAlign="center" size={12}>
                    <Typography variant="h1" fontSize={[44, null, 52]} lineHeight={1} letterSpacing={-1.5}>
                        Convert EOA to<br />
                        <span style={{ background: 'linear-gradient(90deg, #10ff84 0%, #5fddff 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', fontSize: '150%' }}>Smart account</span>
                    </Typography>
                </Grid>
                <Grid size={12} justifyItems="right" textAlign={"right"}>
                    <Typography variant="caption">
                        powered by Safe + EIP-7702
                    </Typography>
                </Grid>
            </Grid>

            {/* Steps */}
            <Grid container size={12} justifyContent="center" alignItems="center">
                <Grid>
                    <Box mb={4}>
                        <Typography variant="h2">1. Connect account</Typography>
                    </Box>
                    <Box mb={4}>
                        <Typography variant="h2">2. Sign authorization</Typography>
                    </Box>
                    <Box mb={4}>
                        <Typography variant="h2">3. Start using&nbsp;
                            <span style={{ background: 'linear-gradient(90deg, #10ff84 0%, #5fddff 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Safe Wallet</span>
                        </Typography>
                    </Box>
                </Grid>
            </Grid>

            <Grid size={12} textAlign="center" margin={5}>
                <Button component={Link}
                    to="/delegate" variant='contained'>Get Started</Button>
            </Grid>

            {/* Note */}
            <Grid textAlign="center">
                    <Alert severity="warning">
                        This software is experimental. Do not use private keys that hold assets on any mainnets.
                    </Alert>
            </Grid>
        </Grid>
    );
}

export default Home;
