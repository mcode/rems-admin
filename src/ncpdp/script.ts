import { Router, Request, Response } from 'express';
import { remsCaseCollection } from '../fhir/models';
const router = Router();

router.post('/ncpdp/script', async (req: Request) => {
  try {
    const requestBody = req.body;
    if (requestBody.message?.body?.rxfill) {
      // call to handle rxfill
      handleRxFill(requestBody);
    } else {
      // do nothing for now
    }
  } catch (error) {
    console.log(error);
    throw error;
  }
});

const handleRxFill = async (bundle: any) => {
  const rxfill = bundle.message?.body?.rxfill;

  const fillStatus = rxfill?.fillstatus?.dispensed?.note;
  const patient = rxfill?.patient;
  const code = rxfill?.medicationprescribed?.drugcoded?.drugdbcode?.code;

  await remsCaseCollection.findOneAndUpdate(
    {
      patientFirstName: patient?.humanpatient?.name?.firstname,
      patientLastName: patient?.humanpatient?.name?.lastname,
      patientDOB: patient?.humanpatient?.dateofbirth?.date,
      drugCode: code
    },
    { dispenseStatus: fillStatus },
    { new: true }
  );
  return fillStatus;
};

export default router;
