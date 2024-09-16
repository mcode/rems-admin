import axios from 'axios'
import { useEffect, useState, SetStateAction } from 'react'
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
        }[]
      | null;
    _id: string;
  };
const CaseCollection = () => {

    const [allData, setAllData] = useState<RemsCase[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        getAllRemsCase();
    }, [])

    const getAllRemsCase = async () => {
        const url = 'http://localhost:8090/all/remscase';
        await axios
        .get(url)
        .then(function (response: { data: SetStateAction<RemsCase[]>; }) {
            setAllData(response.data);
            setIsLoading(false);
        })
        .catch((error: any) => {
            setIsLoading(false);
            console.log('Error -- > ', error);
        })
    }

    const deleteSingleRow = async (event: any, row: RemsCase) => {
        console.log('row to delete is -- > ', row);
        const url = 'http://localhost:8090/remsCase/deleteOne';
        await axios
        .post(url, {data: { params: row}})
        .then(function (response: { data: any; status: number; }) {
            console.log('response data -- > ', response.data);
            if (response.status === 200) {
                console.log('Response.data -- > ', response.data);
                getAllRemsCase();
            }
        })
        .catch((error: any) => {
            setIsLoading(false);
            console.log('Error -- > ', error);
        })
    }

    if (allData.length < 1 && !isLoading) {
        return (
            <Card style={{ padding: '15px' }}>
                <h1>No data</h1>
            </Card>
        )
    } else {
        return (
            <Card sx={{ bgColor: '#F5F5F7' }}>
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
                                    {/* <TableCell align="right">Met Requirements</TableCell> */}
                                    <TableCell align="right">Delete</TableCell>
                                </TableRow>
                                </TableHead>
                                <TableBody>
                                {allData.map(row => {
                                    // console.log('row -- > ', row);
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
                                            <TableCell align="left">{row.auth_number}</TableCell>
                                            <TableCell align="right">
                                                <IconButton aria-label="delete" onClick={(event: any) => deleteSingleRow(event, row)}>
                                                    <DeleteIcon />
                                                </IconButton>
                                            </TableCell>
                                            {/* <TableCell align="right">{row.metRequirements}</TableCell> */}
                                        </TableRow>
                                    )})}
                                </TableBody>
                            </Table>
                            </TableContainer>
                        </CardContent>
                    </Card>
                </Card>
            </Card>
        )
    }
};

export default CaseCollection;