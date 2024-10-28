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
import IconButton from '@mui/material/IconButton';
import DeleteIcon from '@mui/icons-material/Delete';
import { Refresh } from '@mui/icons-material';

export type MetRequirements = {
  drugName?: string;
  requirementName?: string;
  stakeholderId?: string;
  completed?: boolean;
  completedQuestionnaire?: { questionnaire: string };
  case_numbers?: [];
  _id: string;
};

const MetRequirements = (props: { refresh: boolean }) => {
  const [allData, setAllData] = useState<MetRequirements[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (props.refresh) {
      getAllMetReqs();
    }
  }, [props.refresh]);

  useEffect(() => {
    getAllMetReqs();
  }, []);

  const getAllMetReqs = async () => {
    const url = process.env.RESOURCE_SERVER + '/api/all/metreqs';
    await axios
      .get(url)
      .then(function (response: { data: any }) {
        setAllData(response.data);
        setIsLoading(false);
      })
      .catch((error: any) => {
        setIsLoading(false);
        console.log('Error -- > ', error);
      });
  };

  const deleteSingleRow = async (event: any, row: MetRequirements) => {
    const url = process.env.RESOURCE_SERVER + '/api/metreqs/deleteOne';
    await axios
      .post(url, { data: { params: row } })
      .then(function (response: { data: any; status: number }) {
        if (response.status === 200) {
          getAllMetReqs();
        }
      })
      .catch((error: any) => {
        setIsLoading(false);
        console.log('Error -- > ', error);
      });
  };

  const formattedQuestionnaire = (row: MetRequirements) => {
    return row?.completedQuestionnaire?.questionnaire.split(process.env.RESOURCE_SERVER + '/4_0_0/')[1];
  };
  const formattedCompleted = (row: MetRequirements) => {
    return row?.completed === true ? 'Yes' : 'No';
  };

  if (allData.length < 1 && !isLoading) {
    return (
      <Card style={{ padding: '15px' }}>
        <div className="right-btn">
          <Button
            variant="contained"
            sx={{backgroundColor: '#2F6A47'}}
            startIcon={<Refresh />}
            onClick={() => {
              getAllMetReqs();
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
              sx={{backgroundColor: '#2F6A47'}}
              startIcon={<Refresh />}
              onClick={() => {
                getAllMetReqs();
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
                      <TableCell align="right">Drug Name</TableCell>
                      <TableCell align="right">Requirement Name</TableCell>
                      <TableCell align="right">Case Numbers</TableCell>
                      <TableCell align="right">Completed</TableCell>
                      <TableCell align="right">Completed Questionnaire</TableCell>
                      <TableCell align="right">Delete</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {allData.map(row => {
                      const format = formattedQuestionnaire(row);
                      const complete = formattedCompleted(row);
                      return (
                        <TableRow key={row._id}>
                          <TableCell align="right">{row.drugName}</TableCell>
                          <TableCell align="right">{row.requirementName}</TableCell>
                          <TableCell align="right">{row.case_numbers?.join(', ')}</TableCell>
                          <TableCell align="right">{complete}</TableCell>
                          <TableCell align="right">{format}</TableCell>
                          <TableCell align="right">
                            <IconButton
                              aria-label="delete"
                              onClick={(event: any) => deleteSingleRow(event, row)}
                            >
                              <DeleteIcon />
                            </IconButton>
                          </TableCell>
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

export default MetRequirements;
