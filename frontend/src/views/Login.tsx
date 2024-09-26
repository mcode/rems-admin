import { SetStateAction, useState } from 'react';
import axios from 'axios';
import { Avatar, Box, Button, Container, CssBaseline, TextField, Typography } from '@mui/material';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import config from '../../config.json';

const Login = props => {
  const [showMessage, setShowMessage] = useState(false);

  const handleSubmit = (event: {
    preventDefault: () => void;
    currentTarget: HTMLFormElement | undefined;
  }) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const user = data.get('username')?.toString();
    const pass = data.get('password')?.toString();
    if (user && pass) {
      const params = new URLSearchParams();
      params.append('username', user);
      params.append('password', pass);
      params.append('grant_type', 'password');
      params.append('client_id', config.client);
      axios
        .post(`${config.auth}/realms/${config.realm}/protocol/openid-connect/token`, params, {
          withCredentials: true
        })
        .then(
          (result: { data: { scope: string; access_token: SetStateAction<string | null> } }) => {
            // do something with the token
            const scope = result.data.scope;
            if (scope) {
              setShowMessage(true);
              props.tokenCallback(result.data.access_token);
            } else {
              console.error('Unauthorized User');
            }
          }
        )
        .catch(err => {
          if (err.response.status === 401) {
            console.error('Unknown user');
            setShowMessage(true);
          } else {
            console.error(err);
          }
        });
    }
  };

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
        <Avatar sx={{ m: 1 }}>
          <LockOutlinedIcon />
        </Avatar>
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
          <Button type="submit" fullWidth variant="contained" sx={{ mt: 3, mb: 2, backgroundColor: '#2F6A47'}}>
            Sign In
          </Button>
          {showMessage ? <p className="err-msg">Error signing in. Please try again.</p> : ''}
        </Box>
      </Box>
    </Container>
  );
};

export default Login;
