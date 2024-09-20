import { Router, Request, Response } from 'express';
import {
  remsCaseCollection,
  medicationCollection,
  metRequirementsCollection
} from '../fhir/models';
import axios from 'axios';
const router = Router();

router.get('/all/remscase', async (req: Request, res: Response) => {
  try {
    console.log('Getting all data');
    res.send(await remsCaseCollection.find({}));
  } catch (error) {
    console.log('ERROR getting data --> ', error);
    throw error;
  }
});

router.post('/remsCase/deleteOne', async (req: Request, res: Response) => {
  try {
    // delete rems case collection
    await remsCaseCollection.findByIdAndDelete({ _id: req.body.data.params?._id });
    // delete patient met requirements, either enrollment or status update forms
    res.send(`Deleted REMS Case collection case number -  ${req.body.data.params?.case_number}`);
  } catch (error) {
    console.log('ERROR deleting data --> ', error);
    throw error;
  }
});

router.get('/all/medications', async (req: Request, res: Response) => {
  try {
    console.log('Getting all data');
    res.send(await medicationCollection.find({}));
  } catch (error) {
    console.log('ERROR getting data --> ', error);
    throw error;
  }
});

router.get('/all/metreqs', async (req: Request, res: Response) => {
  try {
    console.log('Getting all data');
    res.send(await metRequirementsCollection.find({}));
  } catch (error) {
    console.log('ERROR getting data --> ', error);
    throw error;
  }
});

router.post('/metreqs/deleteOne', async (req: Request, res: Response) => {
  try {
    // delete rems case collection
    await metRequirementsCollection.findByIdAndDelete({ _id: req.body.data.params?._id });
    // delete patient met requirements, either enrollment or status update forms
    res.send(`Deleted met requirement with name -  ${req.body.data.params?.requirementName}`);
  } catch (error) {
    console.log('ERROR deleting data --> ', error);
    throw error;
  }
});

export default router;
