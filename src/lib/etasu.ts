import { Router, Response, Request } from 'express';
import { FhirUtilities } from '../fhir/utilities';
import {
  medicationCollection,
  metRequirementsCollection,
  remsCaseCollection,
  Medication,
  RemsCase,
  Requirement,
  MetRequirements
} from '../fhir/models';
import { getDrugCodeFromMedicationRequest } from '../hooks/hookResources';
import { uid } from 'uid';
import {
  Bundle,
  Coding,
  MedicationRequest,
  MessageHeader,
  Parameters,
  Patient,
  QuestionnaireResponse
} from 'fhir/r4';
import { FilterQuery } from 'mongoose';
const router = Router();

// etasu endpoints
router.get('/:drug', async (req: Request, res: Response) => {
  res.send(await medicationCollection.findOne({ name: req.params.drug }));
});

router.get('/met/:caseId', async (req: Request, res: Response) => {
  console.log('get etasu by caseId: ' + req.params.caseId);
  res.send(await remsCaseCollection.findOne({ case_number: req.params.caseId }));
});

export const getCaseInfo = async (
  remsCaseSearchDict: FilterQuery<RemsCase>,
  medicationSearchDict: FilterQuery<Medication>
): Promise<Pick<
  RemsCase,
  | 'status'
  | 'drugName'
  | 'drugCode'
  | 'patientFirstName'
  | 'patientLastName'
  | 'patientDOB'
  | 'metRequirements'
> | null> => {
  const foundRequirements = await remsCaseCollection.findOne(remsCaseSearchDict);

  // if there are no requirements, then return 'Approved'
  if (!foundRequirements) {
    // look for the medication by name in the medications list
    const drug = await medicationCollection.findOne(medicationSearchDict).exec();

    // iterate through each requirement of the drug
    if (drug?.requirements.length === 0) {
      // create simple rems request to return
      const remsRequest: Pick<
        RemsCase,
        | 'status'
        | 'drugName'
        | 'drugCode'
        | 'patientFirstName'
        | 'patientLastName'
        | 'patientDOB'
        | 'metRequirements'
      > = {
        status: 'Approved',
        drugName: drug?.name,
        drugCode: drug?.code,
        patientFirstName: remsCaseSearchDict.patientFirstName || '',
        patientLastName: remsCaseSearchDict.patientLastName || '',
        patientDOB: remsCaseSearchDict.patientDOB || '',
        metRequirements: []
      };
      return remsRequest;
    }
  }

  // not a supported medication or requirements / record not created yet will return null
  return foundRequirements;
};

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
    const remsCaseSearchDict = {
      patientFirstName: req.params.patientFirstName,
      patientLastName: req.params.patientLastName,
      patientDOB: req.params.patientDOB,
      drugCode: req.params.drugCode
    };
    const medicationSearchDict = {
      code: req.params.drugCode
    };

    res.send(await getCaseInfo(remsCaseSearchDict, medicationSearchDict));
  }
);

router.get(
  '/met/patient/:patientFirstName/:patientLastName/:patientDOB',
  async (req: Request, res: Response) => {
    console.log(
      'get etasu of patient: ' +
        req.params.patientFirstName +
        ' ' +
        req.params.patientLastName +
        ' ' +
        req.params.patientDOB
    );
    const searchDict = {
      patientFirstName: req.params.patientFirstName,
      patientLastName: req.params.patientLastName,
      patientDOB: req.params.patientDOB
    };

    res.send(await remsCaseCollection.find(searchDict));
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
    const remsCaseSearchDict = {
      patientFirstName: req.params.patientFirstName,
      patientLastName: req.params.patientLastName,
      patientDOB: req.params.patientDOB,
      drugName: req.params.drugName
    };
    const medicationSearchDict = {
      name: req.params.drugName
    };

    res.send(await getCaseInfo(remsCaseSearchDict, medicationSearchDict));
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

const pushMetRequirements = (
  matchedMetReq: MetRequirements,
  remsRequest: Pick<RemsCase, 'metRequirements'>
) => {
  remsRequest.metRequirements.push({
    stakeholderId: matchedMetReq?.stakeholderId,
    completed: matchedMetReq?.completed,
    metRequirementId: matchedMetReq?._id,
    requirementName: matchedMetReq?.requirementName,
    requirementDescription: matchedMetReq?.requirementDescription
  });
};

const createMetRequirements = async (metReq: Partial<MetRequirements>) => {
  return await metRequirementsCollection.create(metReq);
};

const createAndPushMetRequirements = async (
  metReq: Partial<MetRequirements>,
  remsRequest: Pick<RemsCase, 'metRequirements'>
) => {
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
  patient: Patient,
  drug: Medication,
  requirement: Requirement,
  questionnaireResponse: QuestionnaireResponse,
  res: Response,
  reqStakeholderReference: string,
  practitionerReference: string,
  pharmacistReference: string,
  patientReference: string
) => {
  const patientFirstName = patient.name?.[0].given?.[0] || '';
  const patientLastName = patient.name?.[0].family || '';
  const patientDOB = patient.birthDate || '';
  let message = '';
  const case_number = uid();

  // create new rems request and add the created metReq to it
  let remsRequestCompletedStatus = 'Approved';
  const remsRequest: Pick<
    RemsCase,
    | 'case_number'
    | 'status'
    | 'drugName'
    | 'drugCode'
    | 'patientFirstName'
    | 'patientLastName'
    | 'patientDOB'
    | 'metRequirements'
  > = {
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
    res.status(200);
    message = 'ERROR: failed to create new met requirement for form initial to case';
    console.log(message);
    res.send(message);
    return res;
  }

  // iterate through all other requirements again to create corresponding false metRequirements / assign to existing
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

  remsRequest.status = remsRequestCompletedStatus;
  const returnedRemsRequestDoc = await remsCaseCollection.create(remsRequest);
  res.status(201);
  res.send(returnedRemsRequestDoc);

  return res;
};

const createMetRequirementAndUpdateCase = async (
  drug: Medication,
  requirement: Requirement,
  questionnaireResponse: QuestionnaireResponse,
  res: Response,
  reqStakeholderReference: string
) => {
  let returnedMetReqDoc;

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

      for (const case_number of returnedMetReqDoc?.case_numbers || []) {
        // get the rems case to update, search by the case_number
        const remsRequestToUpdate = await remsCaseCollection
          .findOne({
            case_number: case_number
          })
          .exec();

        let foundUncompleted = false;
        const metReqArray = remsRequestToUpdate?.metRequirements || [];
        // Check to see if there are any uncompleted requirements, if all have been completed then set status to approved
        for (let i = 0; i < metReqArray.length; i++) {
          const req4 = remsRequestToUpdate?.metRequirements[i];
          // _id comparison would not work for some reason
          if (req4?.requirementName === matchedMetReq.requirementName) {
            metReqArray[i].completed = true;
            req4.completed = true;
            await remsCaseCollection.updateOne(
              { _id: remsRequestToUpdate?._id },
              { $set: { metRequirements: metReqArray } }
            );
          }
          if (!req4?.completed) {
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
    // submitting the requirement but there is no case, create new met requirement
    // create the metReq that was submitted
    const newMetReq = {
      completed: true,
      completedQuestionnaire: questionnaireResponse,
      requirementName: requirement.name,
      requirementDescription: requirement.description,
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
  patient: Patient,
  drug: Medication,
  requirement: Requirement,
  questionnaireResponse: QuestionnaireResponse,
  res: Response,
  reqStakeholderReference: string
) => {
  // Find the specific case associated with an individual patient for the patient status form
  // Is it possible for there to be multiple cases for this patient and the same drug?
  let returnRemsRequest = false;
  let message = '';

  const patientFirstName = patient.name?.[0].given?.[0] || '';
  const patientLastName = patient.name?.[0].family || '';
  const patientDOB = patient.birthDate || '';

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
    res.send(remsRequestToUpdate);
  } else {
    res.send(message);
  }
  return res;
};

router.post('/met', async (req: Request, res: Response) => {
  try {
    const requestBody = req.body as Bundle;

    // extract params and questionnaire response identifier
    const params = getResource(
      requestBody,
      (requestBody.entry?.[0]?.resource as MessageHeader)?.focus?.[0]?.reference || ''
    ) as Parameters;
    const questionnaireResponse = getQuestionnaireResponse(requestBody) as QuestionnaireResponse;
    const questionnaireStringArray = questionnaireResponse?.questionnaire?.split('/');
    const requirementId = questionnaireStringArray?.[questionnaireStringArray.length - 1];

    // stakeholder and medication references
    let prescriptionReference = '';
    let practitionerReference = '';
    let pharmacistReference = '';
    let patientReference = '';
    for (const param of params.parameter || []) {
      if (param.name === 'prescription') {
        prescriptionReference = param.valueReference?.reference || '';
      } else if (param.name === 'prescriber') {
        practitionerReference = param.valueReference?.reference || '';
      } else if (param.name === 'pharmacy') {
        pharmacistReference = param.valueReference?.reference || '';
      } else if (param.name === 'source-patient') {
        patientReference = param.valueReference?.reference || '';
      }
    }

    // obtain drug information from database
    const prescription = getResource(requestBody, prescriptionReference) as MedicationRequest;
    const medicationCode = getDrugCodeFromMedicationRequest(prescription) as Coding;
    const prescriptionSystem = medicationCode?.system;
    const prescriptionCode = medicationCode?.code;
    const patient = getResource(requestBody, patientReference) as Patient;

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
        const stakeholder = requirement.stakeholderType;
        const stakeholderReference =
          stakeholder === 'prescriber'
            ? practitionerReference
            : stakeholder === 'pharmacist'
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
              stakeholderReference,
              practitionerReference,
              pharmacistReference,
              patientReference
            );

            return;
          } else {
            // If it's not the patient status requirement
            if (requirement.requiredToDispense) {
              await createMetRequirementAndUpdateCase(
                drug,
                requirement,
                questionnaireResponse,
                res,
                stakeholderReference
              );
              return;
            } else {
              await createMetRequirementAndUpdateCaseNotRequiredToDispense(
                patient,
                drug,
                requirement,
                questionnaireResponse,
                res,
                stakeholderReference
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

const getResource = (bundle: Bundle, resourceReference: string) => {
  const temp = resourceReference.split('/');
  const _resourceType = temp[0];
  const _id = temp[1];

  if (bundle.entry) {
    for (let i = 0; i < bundle.entry.length; i++) {
      if (
        bundle.entry[i].resource?.resourceType === _resourceType &&
        bundle.entry[i].resource?.id === _id
      ) {
        return bundle.entry[i].resource;
      }
    }
  }
  return null;
};

const getQuestionnaireResponse = (bundle: Bundle) => {
  const _resourceType = 'QuestionnaireResponse';

  if (bundle.entry) {
    for (let i = 0; i < bundle.entry.length; i++) {
      if (bundle.entry[i].resource?.resourceType === _resourceType) {
        return bundle.entry[i].resource as QuestionnaireResponse;
      }
    }
  }
  return null;
};

export default router;
