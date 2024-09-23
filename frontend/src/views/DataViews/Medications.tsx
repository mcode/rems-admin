import axios from 'axios';
import { useEffect, useState, SetStateAction } from 'react';
import {
  Box,
  Button,
  Card,
  CardActions,
  CardContent,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography
} from '@mui/material';
import { Refresh } from '@mui/icons-material';

export type Medication = {
  code?: string;
  codeSystem?: string;
  name?: string;
  requirements: Array<{
    name: string;
    description: string;
    resourceId: string;
    appContext: string;
    requiredToDispense: boolean;
  }>;
  _id: string;
};

const Medications = (props: { refresh: boolean }) => {
  const [allData, setAllData] = useState<Medication[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (props.refresh) {
      getAllMedications();
    }
  }, [props.refresh]);

  useEffect(() => {
    getAllMedications();
  }, []);

  const getAllMedications = async () => {
    const url = 'http://localhost:8090/api/all/medications';
    await axios
      .get(url)
      .then(function (response: { data: SetStateAction<Medication[]> }) {
        setAllData(response.data);
        setIsLoading(false);
      })
      .catch((error: any) => {
        setIsLoading(false);
        console.log('Error -- > ', error);
      });
  };

  const formattedReqs = (row: Medication) => {
    let reqNames: String[] = [];
    row.requirements.forEach((req: any) => {
      reqNames.push(req.name);
    });
    return reqNames.join(', ');
  };

  if (allData.length < 1 && !isLoading) {
    return (
      <Card style={{ padding: '15px' }}>
        <div className="right-btn">
          <Button
            variant="contained"
            startIcon={<Refresh />}
            onClick={() => {
              getAllMedications();
            }}
          >
            Refresh
          </Button>
        </div>
        <h1>No data</h1>
      </Card>
    );
  } else {
    return (
      <Card sx={{ bgColor: '#F5F5F7' }}>
        <Card>
          <div className="right-btn">
            <Button
              variant="contained"
              startIcon={<Refresh />}
              onClick={() => {
                getAllMedications();
              }}
            >
              Refresh
            </Button>
          </div>
          <Card>
            <CardContent>
              <TableContainer component={Paper}>
                <Table sx={{ minWidth: 650 }} aria-label="simple table">
                  <TableHead sx={{ fontWeight: 'bold' }}>
                    <TableRow sx={{ fontWeight: 'bold' }}>
                      <TableCell align="right">Name</TableCell>
                      <TableCell align="right">Code</TableCell>
                      <TableCell align="right">Code System</TableCell>
                      <TableCell align="right">Requirements</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {allData.map(row => {
                      const format = formattedReqs(row);
                      return (
                        <TableRow key={row._id}>
                          <TableCell align="right">{row.name}</TableCell>
                          <TableCell align="right">{row.code}</TableCell>
                          <TableCell align="right">{row.codeSystem}</TableCell>
                          <TableCell align="right">{format}</TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>
        </Card>
      </Card>
    );
  }
};

export default Medications;
