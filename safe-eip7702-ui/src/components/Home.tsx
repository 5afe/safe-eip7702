import React from 'react';
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
                    <Typography variant="h4">
                        Convert EOA to Smart account
                    </Typography>
                </Grid>
                <Grid size={12}>
                    <Typography variant="subtitle2" color="textSecondary" textAlign={"right"}>
                        powered by Safe + EIP-7702
                    </Typography>
                </Grid>
            </Grid>


            {/* Steps */}
            <Grid container size={12} justifyContent="center" alignItems="center">
                <Grid>
                    <Box mb={4}>
                        <Typography variant="h6">1. Connect account</Typography>
                    </Box>
                    <Box mb={4}>
                        <Typography variant="h6">2. Sign authorization</Typography>
                    </Box>
                    <Box mb={4}>
                        <Typography variant="h6">3. Start using Safe wallet</Typography>
                    </Box>
                </Grid>
            </Grid>

            <Grid size={12} textAlign="center" margin={10}>
                <Button  component={Link}
            to="/delegate" variant='contained'>Get Started</Button>
            </Grid>

            {/* Note */}
            <Grid textAlign="center">
                <Box mt={3}>
                    <Alert severity="warning" style={{ maxWidth: '600px', margin: 'auto' }}>
                        This software is experimental. Do not use private keys that hold assets on any mainnets.
                    </Alert>
                </Box>
            </Grid>
        </Grid>
    );
}

export default Home;
