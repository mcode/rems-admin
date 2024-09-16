import './App.css'
import { BrowserRouter, Link, Route, Routes } from 'react-router-dom';
import { Button } from '@mui/material';
import Box from '@mui/material/Box';
import { Container } from '@mui/system';
import DatasetIcon from '@mui/icons-material/Dataset';
import Login from './views/Login';
import Register from './views/Register';
import Data from './views/DataViews/Data';

function App() {

  return (
    <Box>
      <BrowserRouter>
        <div className='App'> 
          <Container maxWidth='false'>
            <div className="containerg">
                <div className="logo">
                  <DatasetIcon
                    sx={{ color: 'white', fontSize: 40, paddingTop: 2.5, paddingRight: 2.5 }}
                  />
                  <h1>Rems Admin</h1>
                </div>
                <div className="links">
                  <Link className="navButtons" to="/view/data">
                    <Button variant="outlined" className="white-btn">Data</Button>
                  </Link>
                  <Link className="navButtons" to="/register">
                    <Button variant="outlined" className="white-btn">Register User</Button>
                  </Link>
                  <Link className="navButtons" to="/login">
                    <Button variant="outlined" className="white-btn">Login</Button>
                  </Link>
                </div>
              </div>
          </Container>

        </div>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/view/data" element={<Data />} />
          <Route path="/" exact element={<Login />} />
        </Routes>
      </BrowserRouter>
    </Box>
  )
}

export default App
