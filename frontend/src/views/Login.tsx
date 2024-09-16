import { useState } from 'react'
import { Avatar, Box, Button, Container, CssBaseline, TextField, Typography } from '@mui/material';
import LockOpenOutlinedIcon from '@mui/icons-material/LockOpenOutlined';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';

const Login = () => {
    const [token, setToken] = useState<string | null>(null);


    const handleSubmit = () => {
        console.log('handle submit');
    }

    return (
        <Container component="main" maxWidth="xs">
            <CssBaseline />
            <Box
            sx={{
                marginTop: 8,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center'
            }}
            >
            {token ? (
                <Avatar sx={{ m: 1, bgcolor: 'secondary.success' }}>
                <LockOpenOutlinedIcon />
                </Avatar>
            ) : (
                <Avatar sx={{ m: 1, bgcolor: 'secondary.main' }}>
                <LockOutlinedIcon />
                </Avatar>
            )}
            <Typography component="h1" variant="h5">
                Sign in
            </Typography>
            <Box component="form" onSubmit={handleSubmit} noValidate sx={{ mt: 1 }}>
                <TextField
                margin="normal"
                fullWidth
                id="email"
                label="Username"
                name="username"
                autoComplete="username"
                autoFocus
                />
                <TextField
                margin="normal"
                fullWidth
                name="password"
                label="Password"
                type="password"
                id="password"
                autoComplete="current-password"
                />
                <Button type="submit" fullWidth variant="contained" sx={{ mt: 3, mb: 2 }}>
                    Sign In
                </Button>
            </Box>
            </Box>
        </Container>
    )

}

export default Login;