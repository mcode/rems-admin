import './App.css';
import { useState } from 'react';
import { Button } from '@mui/material';
import Box from '@mui/material/Box';
import { Container } from '@mui/system';
import DatasetIcon from '@mui/icons-material/Dataset';
import Login from './views/Login';
import Data from './views/DataViews/Data';
import axios from 'axios';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogTitle from '@mui/material/DialogTitle';

function App() {
  const [token, setToken] = useState(null);
  const [open, setOpen] = useState(false);
  const [forceRefresh, setForceRefresh] = useState(false);

  const handleClickOpen = () => {
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
  };

  const resetDB = async () => {
    setOpen(false);
    await axios
      .post('http://localhost:8090/etasu/reset')
      .then(function (response: any) {
        console.log(response);
        setForceRefresh(true);
      })
      .catch((error: any) => {
        console.log('Error resetting the DB -- > ', error);
      });
  };

  return (
    <Box>
      <div className="App">
        <Container maxWidth="false">
          <div className="containerg">
            <div className="logo">
              <DatasetIcon
                sx={{ color: 'white', fontSize: 40, paddingTop: 2.5, paddingRight: 2.5 }}
              />
              <h1>Rems Admin</h1>
            </div>
            {token ? (
              <div className="links">
                <Button variant="outlined" className="white-btn" onClick={() => handleClickOpen()}>
                  Reset full DB
                </Button>
                <Button variant="outlined" className="white-btn" onClick={() => setToken(null)}>
                  Logout
                </Button>
              </div>
            ) : (
              <span></span>
            )}
          </div>
        </Container>
        <Dialog
          open={open}
          onClose={handleClose}
          aria-labelledby="alert-dialog-title"
          aria-describedby="alert-dialog-description"
        >
          <DialogTitle id="alert-dialog-title">{'Reset Rems Admin Database?'}</DialogTitle>
          <DialogContent>
            <DialogContentText id="alert-dialog-description">
              Resetting the rems admin database will delete any existing rems case information and
              completed questionnaires.
            </DialogContentText>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleClose}>Close</Button>
            <Button onClick={resetDB} autoFocus>
              Reset DB
            </Button>
          </DialogActions>
        </Dialog>
      </div>
      {token ? <Data refresh={forceRefresh} /> : <Login tokenCallback={setToken} />}
    </Box>
  );
}

export default App;
