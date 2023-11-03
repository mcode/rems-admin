import { Router, Response, Request } from 'express';
import { FhirUtilities } from '../fhir/utilities';
import {
  medicationCollection,
  metRequirementsCollection,
  remsCaseCollection,
  Medication
} from '../fhir/models';
import { Patient } from 'fhir/r4';
import { uid } from 'uid';
const router = Router();

// const medicationCollection = db.collection('medication-requirements');
// const metRequirementsCollection = db.collection('met-requirements');
// const remsCaseCollection = db.collection('rems-case');

// etasu endpoints
router.get('/:drug', async (req: Request, res: Response) => {
  res.send(await medicationCollection.findOne({ name: req.params.drug }));
});

router.get('/met/:caseId', async (req: Request, res: Response) => {
  console.log('get etasu by caseId: ' + req.params.caseId);
  res.send(await remsCaseCollection.findOne({ case_number: req.params.caseId }));
});

router.get(
  '/met/patient/:patientFirstName/:patientLastName/:patientDOB/drugCode/:drugCode',
  async (req: Request, res: Response) => {
    console.log(
      'get etasu by drug code and patient: ' +
        req.params.patientFirstName +
        ' ' +
        req.params.patientLastName +
        ' ' +
        req.params.patientDOB +
        ' - ' +
        req.params.drugCode
    );
    const searchDict = {
      patientFirstName: req.params.patientFirstName,
      patientLastName: req.params.patientLastName,
      patientDOB: req.params.patientDOB,
      drugCode: req.params.drugCode
    };

    res.send(await remsCaseCollection.findOne(searchDict));
  }
);

router.get(
  '/met/patient/:patientFirstName/:patientLastName/:patientDOB/drug/:drugName',
  async (req: Request, res: Response) => {
    console.log(
      'get etasu by drug name and patient: ' +
        req.params.patientFirstName +
        ' ' +
        req.params.patientLastName +
        ' ' +
        req.params.patientDOB +
        ' - ' +
        req.params.drugName
    );
    const searchDict = {
      patientFirstName: req.params.patientFirstName,
      patientLastName: req.params.patientLastName,
      patientDOB: req.params.patientDOB,
      drugName: req.params.drugName
    };

    res.send(await remsCaseCollection.findOne(searchDict));
  }
);

router.post('/reset', async (req: Request, res: Response) => {
  console.log('Dropping collections');
  await medicationCollection.deleteMany({});
  await remsCaseCollection.deleteMany({});
  await metRequirementsCollection.deleteMany({});
  console.log('Resetting the database');
  await FhirUtilities.populateDB();
  res.send('reset etasu database collections');
});

const pushMetRequirements = (matchedMetReq: any, remsRequest: any) => {
  remsRequest.metRequirements.push({
    stakeholderId: matchedMetReq?.stakeholderId,
    completed: matchedMetReq?.completed,
    metRequirementId: matchedMetReq?._id,
    requirementName: matchedMetReq?.requirementName,
    requirementDescription: matchedMetReq?.requirementDescription
  });
};

const createMetRequirements = async (metReq: any) => {
  return await metRequirementsCollection.create(metReq);
};

const createAndPushMetRequirements = async (metReq: any, remsRequest: any) => {
  try {
    const matchedMetReq = await createMetRequirements(metReq);
    pushMetRequirements(matchedMetReq, remsRequest);
  } catch (e) {
    console.log('ERROR: failed in createAndPushMetRequirements');
    console.log(e);
    return false;
  }
  return true;
};

const createMetRequirementAndNewCase = async (
  patient: any,
  drug: Medication,
  requirement: any,
  questionnaireResponse: any,
  res: Response,
  reqStakeholderReference: any,
  practitionerReference: string,
  pharmacistReference: string,
  patientReference: string
) => {
  const patientFirstName = patient.name[0].given[0];
  const patientLastName = patient.name[0].family;
  const patientDOB = patient.birthDate;
  let message = '';
  var createNewCase = true;
  let returnedRemsRequestDoc: any;
  const case_number = uid();

  // create new rems request and add the created metReq to it
  let remsRequestCompletedStatus = 'Approved';
  const remsRequest: any = {
    case_number: case_number,
    status: remsRequestCompletedStatus,
    drugName: drug?.name,
    drugCode: drug?.code,
    patientFirstName: patientFirstName,
    patientLastName: patientLastName,
    patientDOB: patientDOB,
    metRequirements: []
  };

  // create the metReq that was submitted
  const metReq = {
    completed: true,
    completedQuestionnaire: questionnaireResponse,
    requirementName: requirement.name,
    requirementDescription: requirement.description,
    drugName: drug?.name,
    stakeholderId: reqStakeholderReference,
    case_numbers: [case_number]
  };

  if (!(await createAndPushMetRequirements(metReq, remsRequest))) {
    createNewCase = false;
    res.status(200);
    message = 'ERROR: failed to create new met requirement for form initial to case';
    console.log(message);
    res.send(message);
    return res;
  }

  // iterate through all other reqs again to create corresponding false metReqs / assign to existing
  for (const requirement2 of drug.requirements) {
    // skip if the req found is the same as in the outer loop and has already been processed
    // && If the requirement is not the patient Status Form (when requiredToDispense == false)
    if (!(requirement2.resourceId === requirement.resourceId) && requirement2.requiredToDispense) {
      // figure out which stakeholder the req corresponds to
      const reqStakeholder2 = requirement2.stakeholderType;
      const reqStakeholder2Reference =
        reqStakeholder2 === 'prescriber'
          ? practitionerReference
          : reqStakeholder2 === 'pharmacist'
          ? pharmacistReference
          : patientReference;

      const matchedMetReq2 = await metRequirementsCollection
        .findOne({
          stakeholderId: reqStakeholder2Reference,
          requirementName: requirement2.name,
          drugName: drug?.name
        })
        .exec();
      if (matchedMetReq2) {
        pushMetRequirements(matchedMetReq2, remsRequest);

        if (!matchedMetReq2.completed) {
          remsRequestCompletedStatus = 'Pending';
        }
        matchedMetReq2.case_numbers.push(case_number);
        await matchedMetReq2.save();
      } else {
        // create the metReq that was submitted
        const newMetReq = {
          completed: false,
          completedQuestionnaire: null,
          requirementName: requirement2.name,
          requirementDescription: requirement2.description,
          drugName: drug?.name,
          stakeholderId: reqStakeholder2Reference,
          case_numbers: [case_number]
        };

        remsRequestCompletedStatus = 'Pending';

        if (!(await createAndPushMetRequirements(newMetReq, remsRequest))) {
          message = 'ERROR: failed to create new met requirement for form initial to case';
          console.log(message);
        }
      }
    }
  }

  if (createNewCase) {
    remsRequest.status = remsRequestCompletedStatus;
    returnedRemsRequestDoc = await remsCaseCollection.create(remsRequest);
  }

  res.status(201);
  res.send(returnedRemsRequestDoc);

  return res;
};

const createMetRequirementAndUpdateCase = async (
  drug: Medication,
  requirement: any,
  questionnaireResponse: any,
  res: Response,
  reqStakeholderReference: any
) => {
  let returnedMetReqDoc: any;

  const matchedMetReq = await metRequirementsCollection
    .findOne({
      stakeholderId: reqStakeholderReference,
      requirementName: requirement.name,
      drugName: drug?.name
    })
    .exec();
  // Has the patient enrollment been submitted?
  if (matchedMetReq) {
    // If the prescriber enrollment form is submitted twice then nothing will be update
    // If this is the first time submitting the prescriber enrollment and there is a case then we set to true the completed status
    if (!matchedMetReq.completed) {
      matchedMetReq.completed = true;
      matchedMetReq.completedQuestionnaire = questionnaireResponse;
      await matchedMetReq.save();

      //Getting the update document
      returnedMetReqDoc = await metRequirementsCollection
        .findOne({
          _id: matchedMetReq._id
        })
        .exec();

      for (const case_number of returnedMetReqDoc.case_numbers) {
        // get the rems case to update, search by the case_number
        const remsRequestToUpdate = await remsCaseCollection
          .findOne({
            case_number: case_number
          })
          .exec();

        let foundUncompleted = false;
        const metReqArray = remsRequestToUpdate?.metRequirements;
        // Check to see if there are any uncompleted requirements, if all have been completed then set status to approved
        for (let i = 0; i < remsRequestToUpdate?.metRequirements.length; i++) {
          const req4 = remsRequestToUpdate?.metRequirements[i];
          // _id comparison would not work for some reason
          if (req4.requirementName === matchedMetReq.requirementName) {
            metReqArray[i].completed = true;
            req4.completed = true;
            await remsCaseCollection.updateOne(
              { _id: remsRequestToUpdate?._id },
              { $set: { metRequirements: metReqArray } }
            );
          }
          if (!req4.completed) {
            foundUncompleted = true;
          }
        }

        if (!foundUncompleted && remsRequestToUpdate?.status === 'Pending') {
          remsRequestToUpdate.status = 'Approved';
          await remsRequestToUpdate.save();
        }
      }
    }
  } else {
    // submitting the requirment but there is no case, create new met requirment
    // create the metReq that was submitted
    const newMetReq = {
      completed: true,
      completedQuestionnaire: questionnaireResponse,
      requirementName: requirement.name,
      requirementDescription: requirement.requirementDescription,
      drugName: drug?.name,
      stakeholderId: reqStakeholderReference,
      case_numbers: []
    };

    returnedMetReqDoc = await createMetRequirements(newMetReq);
  }

  res.status(201);
  res.send(returnedMetReqDoc);
  return res;
};

const createMetRequirementAndUpdateCaseNotRequiredToDispense = async (
  patient: any,
  drug: Medication,
  requirement: any,
  questionnaireResponse: any,
  res: Response,
  reqStakeholderReference: any
) => {
  // Find the specific case associated with an individual patient for the patient status form
  // Is it possible for there to be multiple cases for this patient and the same drug?
  let returnedRemsRequestDoc: any;
  let returnRemsRequest = false;
  let message = '';

  const patientFirstName = patient.name[0].given[0];
  const patientLastName = patient.name[0].family;
  const patientDOB = patient.birthDate;

  const remsRequestToUpdate = await remsCaseCollection
    .findOne({
      patientFirstName: patientFirstName,
      patientLastName: patientLastName,
      patientDOB: patientDOB,
      drugCode: drug?.code
    })
    .exec();
  // If you found a case for the patient status form to update
  if (remsRequestToUpdate) {
    if (remsRequestToUpdate.status === 'Approved') {
      const now = new Date();
      const metReq = {
        completed: true,
        completedQuestionnaire: questionnaireResponse,
        requirementName: requirement.name + ' - ' + now.toLocaleString(),
        requirementDescription: requirement.description,
        drugName: drug?.name,
        stakeholderId: reqStakeholderReference,
        case_numbers: [remsRequestToUpdate.case_number]
      };

      if (!(await createAndPushMetRequirements(metReq, remsRequestToUpdate))) {
        message = 'ERROR: failed to create new met requirement for form not required to dispense';
        console.log(message);
      } else {
        try {
          await remsRequestToUpdate.save();
          returnRemsRequest = true;
          returnedRemsRequestDoc = remsRequestToUpdate;
        } catch (e) {
          console.log(e);
          message = 'ERROR: failed to update rems case with requirement not needed to dispense';
          console.log(message);
        }
      }
    } else {
      message =
        'ERROR: rems case has not been approved, status form (or other form not required to dispense) submitted before all other ETASU have been met';
      console.log(message);
    }
  } else {
    // should not get here since a form not required for dispensing should not be given to the provider until a case is created
    message =
      'ERROR: no case exists for this form to match status form (or other form not required to dispense) submitted before initial form creating case was sent (patient status form)';
    console.log(message);
  }

  res.status(201);
  if (returnRemsRequest) {
    res.send(returnedRemsRequestDoc);
  } else {
    res.send(message);
  }
  return res;
};

router.post('/met', async (req: Request, res: Response) => {
  try {
    const requestBody = req.body;

    // extract params and questionnaire response identifier
    const params = getResource(requestBody, requestBody.entry[0].resource.focus?.[0]?.reference);
    const questionnaireResponse = getQuestionnaireResponse(requestBody);
    const questionnaireStringArray = questionnaireResponse.questionnaire.split('/');
    const requirementId = questionnaireStringArray[questionnaireStringArray.length - 1];

    // stakeholder and medication references
    let prescriptionReference = '';
    let practitionerReference = '';
    let pharmacistReference = '';
    let patientReference = '';
    for (const param of params.parameter) {
      if (param.name === 'prescription') {
        prescriptionReference = param.valueReference.reference;
      } else if (param.name === 'prescriber') {
        practitionerReference = param.valueReference.reference;
      } else if (param.name === 'pharmacy') {
        pharmacistReference = param.valueReference.reference;
      } else if (param.name === 'source-patient') {
        patientReference = param.valueReference.reference;
      }
    }

    // obtain drug information from database
    const prescription = getResource(requestBody, prescriptionReference);
    const prescriptionSystem = prescription.medicationCodeableConcept.coding[0].system;
    const prescriptionCode = prescription.medicationCodeableConcept.coding[0].code;
    const patient = getResource(requestBody, patientReference);

    const drug = await medicationCollection
      .findOne({
        code: prescriptionCode,
        codeSystem: prescriptionSystem
      })
      .exec();
    // iterate through each requirement of the drug
    if (drug) {
      for (const requirement of drug.requirements) {
        // figure out which stakeholder the req corresponds to
        const reqStakeholder = requirement.stakeholderType;
        const reqStakeholderReference =
          reqStakeholder === 'prescriber'
            ? practitionerReference
            : reqStakeholder === 'pharmacist'
            ? pharmacistReference
            : patientReference;

        // if the requirement is the one submitted continue
        if (requirement.resourceId === requirementId) {
          // if the req submitted is a patient enrollment form and requires creating a new case
          if (requirement.createNewCase) {
            await createMetRequirementAndNewCase(
              patient,
              drug,
              requirement,
              questionnaireResponse,
              res,
              reqStakeholderReference,
              practitionerReference,
              pharmacistReference,
              patientReference
            );

            return;
          } else {
            // If its not the patient status requirement
            if (requirement.requiredToDispense) {
              await createMetRequirementAndUpdateCase(
                drug,
                requirement,
                questionnaireResponse,
                res,
                reqStakeholderReference
              );
              return;
            } else {
              await createMetRequirementAndUpdateCaseNotRequiredToDispense(
                patient,
                drug,
                requirement,
                questionnaireResponse,
                res,
                reqStakeholderReference
              );
              return;
            }
          }
          break;
        }
      }
    }
  } catch (error) {
    console.log(error);
    throw error;
  }
});

const getResource = (bundle: { entry: any[] }, resourceReference: string) => {
  const temp = resourceReference.split('/');
  const _resourceType = temp[0];
  const _id = temp[1];

  for (let i = 0; i < bundle.entry.length; i++) {
    if (
      bundle.entry[i].resource.resourceType === _resourceType &&
      bundle.entry[i].resource.id === _id
    ) {
      return bundle.entry[i].resource;
    }
  }
  return null;
};

const getQuestionnaireResponse = (bundle: { entry: any[] }) => {
  const _resourceType = 'QuestionnaireResponse';

  for (let i = 0; i < bundle.entry.length; i++) {
    if (bundle.entry[i].resource.resourceType === _resourceType) {
      return bundle.entry[i].resource;
    }
  }
  return null;
};

export default router;
