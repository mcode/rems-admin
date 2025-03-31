import axios from 'axios';
import { useEffect, useState, SetStateAction } from 'react';
import {
  Button,
  Card,
  CardContent,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow
} from '@mui/material';
import IconButton from '@mui/material/IconButton';
import DeleteIcon from '@mui/icons-material/Delete';
import { Refresh } from '@mui/icons-material';
import CircleIcon from '@mui/icons-material/Circle';
import Tooltip from '@mui/material/Tooltip';
import FormPopup from '../FormPopup';

export type RemsCase = {
  case_number?: string;
  auth_number?: string;
  patientFirstName?: string;
  patientLastName?: string;
  patientDOB?: string;
  drugCode?: string;
  drugName?: number;
  status?: string;
  dispenseStatus?: string;
  metRequirements:
    | {
        metRequirementId: string;
        requirementsDescription: string;
        requirementName: string;
        stakeholderId: string;
        completed: boolean;
      }[];
  _id: string;
};
const CaseCollection = (props: { refresh: boolean }) => {
  const [allData, setAllData] = useState<RemsCase[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [rowData, setRowData] = useState({});

  useEffect(() => {
    if (props.refresh) {
      getAllRemsCase();
    }
  }, [props.refresh]);

  useEffect(() => {
    getAllRemsCase();
  }, []);

  const getAllRemsCase = async () => {
    const url = process.env.RESOURCE_SERVER + 'api/all/remscase';
    await axios
      .get(url)
      .then(function (response: { data: SetStateAction<RemsCase[]> }) {
        setAllData(response.data);
        setIsLoading(false);
      })
      .catch((error: any) => {
        setIsLoading(false);
        console.log('Error -- > ', error);
      });
  };

  const deleteSingleRow = async (event: any, row: RemsCase) => {
    const url = process.env.RESOURCE_SERVER + 'api/remsCase/deleteOne';
    await axios
      .post(url, { data: { params: row } })
      .then(function (response: { data: any; status: number }) {
        if (response.status === 200) {
          getAllRemsCase();
        }
      })
      .catch((error: any) => {
        setIsLoading(false);
        console.log('Error -- > ', error);
      });
  };

  const openForms = (event: any, row: RemsCase) => {
    setRowData(row);
    setOpen(true);
  }

  const handleClose = () => {
    setOpen(false);
  }

  const formattedReqs = (row: RemsCase) => {
    let allCompleted = true;
    let color = '#f0ad4e';
    let tooltip = 'Forms not completed';
    row.metRequirements.forEach((req: any) => {
      if (!req.completed) {
        allCompleted = false;
      }
    });
    if (allCompleted) {
      color = 'green';
      tooltip = 'Forms completed';
    }
    return (
      <Tooltip title={tooltip}>
        <IconButton onClick={(event: any) => openForms(event, row)}>
            <CircleIcon sx={{color: color}} />
        </IconButton>
      </Tooltip>
    )
  };

  if (allData.length < 1 && !isLoading) {
    return (
      <Card style={{ padding: '15px' }}>
        <div className="right-btn">
          <Button
            variant="contained"
            startIcon={<Refresh />}
            onClick={() => {
              getAllRemsCase();
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
        <div className="right-btn">
          <Button
            variant="contained"
            sx={{backgroundColor: '#2F6A47'}}
            startIcon={<Refresh />}
            onClick={() => {
              getAllRemsCase();
            }}
          >
            Refresh
          </Button>
        </div>
        <Card>
          <Card>
            <CardContent>
              <TableContainer component={Paper}>
                <Table sx={{ minWidth: 650 }} aria-label="simple table">
                  <TableHead sx={{ fontWeight: 'bold' }}>
                    <TableRow sx={{ fontWeight: 'bold' }}>
                      <TableCell align="right">Case Number</TableCell>
                      <TableCell align="right">Patient First Name</TableCell>
                      <TableCell align="right">Patient Last Name</TableCell>
                      <TableCell align="right">Drug Name</TableCell>
                      <TableCell align="right">Drug Code</TableCell>
                      <TableCell align="right">Patient DOB</TableCell>
                      <TableCell align="right">Status</TableCell>
                      <TableCell align="right">Dispense Status</TableCell>
                      <TableCell align="left">Authorization Number</TableCell>
                      <TableCell align="right">Met Requirements</TableCell>
                      <TableCell align="right">Delete</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {allData.map(row => {
                      const metReq = formattedReqs(row);
                      return (
                        <TableRow key={row.case_number}>
                          <TableCell align="right">{row.case_number}</TableCell>
                          <TableCell align="right">{row.patientFirstName}</TableCell>
                          <TableCell align="right">{row.patientLastName}</TableCell>
                          <TableCell align="right">{row.drugName}</TableCell>
                          <TableCell align="right">{row.drugCode}</TableCell>
                          <TableCell align="right">{row.patientDOB}</TableCell>
                          <TableCell align="right">{row.status}</TableCell>
                          <TableCell align="right">{row.dispenseStatus}</TableCell>
                          <TableCell align="right">{row.auth_number}</TableCell>
                          <TableCell align="center">{metReq}</TableCell>
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
        <FormPopup open={open} handleClose={handleClose} data={rowData} />
      </Card>
    );
  }
};

export default CaseCollection;
