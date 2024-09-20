import { Router, Request, Response } from 'express';
import {
  remsCaseCollection,
  medicationCollection,
  metRequirementsCollection
} from '../fhir/models';
const router = Router();

router.get('/all/remscase', async (req: Request, res: Response) => {
  try {
    console.log('Getting all rems case collection');
    res.send(await remsCaseCollection.find({}));
  } catch (error) {
    console.log('ERROR getting rems case collection --> ', error);
    throw error;
  }
});

router.post('/remsCase/deleteOne', async (req: Request, res: Response) => {
  try {
    // delete rems case collection
    await remsCaseCollection.findByIdAndDelete({ _id: req.body.data.params?._id });
    // find and delete patient met requirements, either enrollment or status update forms
    const allMatchedMetReqs = await metRequirementsCollection.find({
      case_numbers: { $in: req.body.data.params?.case_number }
    });
    allMatchedMetReqs.forEach(async matchedReq => {
      if (matchedReq.requirementName.includes('Patient')) {
        await metRequirementsCollection.findOneAndDelete({ _id: matchedReq._id });
      } else {
        // If not a patient form - remove case number from prescriber forms
        await metRequirementsCollection.findOneAndUpdate(
          { _id: matchedReq._id },
          {
            case_numbers: matchedReq.case_numbers.filter(
              num => num !== req.body.data.params?.case_number
            )
          },
          { new: true }
        );
      }
    });
    res.send(
      `Deleted REMS Case collection and patient forms with case number -  ${req.body.data.params?.case_number}`
    );
  } catch (error) {
    console.log('ERROR deleting data --> ', error);
    throw error;
  }
});

router.get('/all/medications', async (req: Request, res: Response) => {
  try {
    console.log('Getting all medications');
    res.send(await medicationCollection.find({}));
  } catch (error) {
    console.log('ERROR getting all medications --> ', error);
    throw error;
  }
});

router.get('/all/metreqs', async (req: Request, res: Response) => {
  try {
    console.log('Getting all met requirements');
    res.send(await metRequirementsCollection.find({}));
  } catch (error) {
    console.log('ERROR getting met requirements --> ', error);
    throw error;
  }
});

router.post('/metreqs/deleteOne', async (req: Request, res: Response) => {
  try {
    // delete met requirements
    await metRequirementsCollection.findByIdAndDelete({ _id: req.body.data.params?._id });
    res.send(`Deleted met requirement with name -  ${req.body.data.params?.requirementName}`);
  } catch (error) {
    console.log('ERROR deleting met requirement --> ', error);
    throw error;
  }
});

export default router;
