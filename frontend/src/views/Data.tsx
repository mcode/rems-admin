import { SetStateAction, SyntheticEvent, useState } from 'react'
import axios from 'axios'
import { useEffect } from 'react'
import { Box, Tab, Tabs } from '@mui/material';
import { Container } from '@mui/system';

function a11yProps(index: number) {
    return {
      id: `simple-tab-${index}`,
      'aria-controls': `simple-tabpanel-${index}`
    };
  }
const Data = () => {

    const [allData, setAllData] = useState([]);
    const [tabIndex, setValue] = useState(0);

    const handleChange = (event: SyntheticEvent, newValue: number) => {
      setValue(newValue);
    };

    useEffect(() => {
        getAllRemsCase();
    }, [])

    const getAllRemsCase = async () => {
        const url = 'http://localhost:8090/all/remscase';
        await axios
        .get(url)
        .then(function (response: { data: SetStateAction<never[]>; }) {
            console.log('Response is -- > ', response);
            setAllData(response.data);

        })
        .catch((error: any) => {
            console.log('Error -- > ', error);
        })
    }

    return (
        <Container maxWidth="xl">
            <Box
                sx={{
                    width: '100%',
                    border: 1,
                    borderRadius: '5px',
                    borderWidth: 4,
                    borderColor: '#F1F3F4',
                    backgroundColor: '#E7EBEF'
                }}
            >
                <Box sx={{ backgroundColor: '#F1F3F4', borderBottom: 1, borderColor: 'divider' }}>
                <Tabs value={tabIndex} onChange={handleChange} aria-label="basic tabs example" centered>
                    <Tab label="Rems Case Collection" {...a11yProps(0)} />
                    <Tab label="Etasu" {...a11yProps(1)} />
                    <Tab label="Other" {...a11yProps(2)} />
                </Tabs>
                </Box>

                <Box>
                <Box sx={{ padding: 2 }}>
                    {tabIndex === 0 && (
                    <Box>
                        <div>This is for rems case</div>
                    </Box>
                    )}
                    {tabIndex === 1 && (
                    <Box>
                    <div>This is for etasu</div>
                    </Box>
                    )}
                    {tabIndex === 2 && (
                    <Box>
                        <div>This is for other</div>
                    </Box>
                    )}
                </Box>
                </Box>
            </Box>

        </Container>
    )

}

export default Data;