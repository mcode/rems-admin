import './App.css'
import { useState } from 'react';
import { Button } from '@mui/material';
import Box from '@mui/material/Box';
import { Container } from '@mui/system';
import DatasetIcon from '@mui/icons-material/Dataset';
import Login from './views/Login';
import Data from './views/DataViews/Data';
import axios from 'axios'


function App() {
  const [token, setToken] = useState(null);

  const resetDB = async () => {
    await axios
    .post('http://localhost:8090/etasu/reset')
    .then(function (response: any) {
        console.log(response);
;    })
    .catch((error: any) => {
        console.log('Error resetting the DB -- > ', error);
    })
  }

  return (
    <Box>
        <div className='App'> 
          <Container maxWidth='false'>
            <div className="containerg">
                <div className="logo">
                  <DatasetIcon
                    sx={{ color: 'white', fontSize: 40, paddingTop: 2.5, paddingRight: 2.5 }}
                  />
                  <h1>Rems Admin</h1>
                </div>
                { token ? (
                  <div className="links">
                      <Button variant="outlined" className="white-btn" onClick={() => resetDB()}>Reset full DB</Button>
                      <Button variant="outlined" className="white-btn" onClick={() => setToken(null)}>Logout</Button>
                  </div>
                  ) : ( <span></span>)
                }
              </div>
          </Container>
        </div>
        { token ? (
            <Data />
            ) : (
              <Login tokenCallback={setToken} />
            )
          }
    </Box>
  )
}

export default App
