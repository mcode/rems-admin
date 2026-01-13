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
  | 'case_number'
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
        | 'case_number'
        | 'drugCode'
        | 'patientFirstName'
        | 'patientLastName'
        | 'patientDOB'
        | 'metRequirements'
      > = {
        status: 'Approved',
        drugName: drug?.name,
        case_number: remsCaseSearchDict.case_number || '',
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

export const createNewRemsCaseFromCDSHook = async (
  patient: Patient,
  drug: Medication,
  practitionerReference: string,
  pharmacistReference: string,
  patientReference: string,
  medicationRequestReference: string,
  originatingFhirServer?: string
) => {
  const patientFirstName = patient.name?.[0].given?.[0] || '';
  const patientLastName = patient.name?.[0].family || '';
  const patientDOB = patient.birthDate || '';
  const case_number = uid();

  // Check if case already exists
  const existingCase = await remsCaseCollection.findOne({
    patientFirstName: patientFirstName,
    patientLastName: patientLastName,
    patientDOB: patientDOB,
    drugCode: drug?.code
  });

  if (existingCase) {
    console.log(
      `Case already exists for patient ${patientFirstName} ${patientLastName} and drug ${drug?.name}`
    );
    return existingCase;
  }

  // Create new case with all requirements pending
  const remsRequest: Pick<
    RemsCase,
    | 'case_number'
    | 'status'
    | 'dispenseStatus'
    | 'drugName'
    | 'drugCode'
    | 'drugNdcCode'
    | 'patientFirstName'
    | 'patientLastName'
    | 'patientDOB'
    | 'medicationRequestReference'
    | 'currentPrescriberId'
    | 'currentPharmacyId'
    | 'prescriberHistory'
    | 'pharmacyHistory'
    | 'prescriptionEvents'
    | 'metRequirements'
  > & { originatingFhirServer?: string } = {
    case_number: case_number,
    status: 'Pending',
    dispenseStatus: 'Pending',
    drugName: drug?.name,
    drugCode: drug?.code,
    drugNdcCode: drug?.ndcCode,
    patientFirstName: patientFirstName,
    patientLastName: patientLastName,
    patientDOB: patientDOB,
    medicationRequestReference: medicationRequestReference,
    currentPrescriberId: practitionerReference,
    currentPharmacyId: pharmacistReference,
    prescriberHistory: [practitionerReference],
    pharmacyHistory: pharmacistReference ? [pharmacistReference] : [],
    prescriptionEvents: [
      {
        medicationRequestReference: medicationRequestReference,
        prescriberId: practitionerReference,
        pharmacyId: pharmacistReference,
        timestamp: new Date(),
        originatingFhirServer: originatingFhirServer,
        caseStatusAtTime: 'Pending'
      }
    ],
    originatingFhirServer: originatingFhirServer,
    metRequirements: []
  };

  // Iterate through ALL requirements and create as unmet (or link to existing if already completed)
  for (const requirement of drug.requirements) {
    // Only process requirements that are required to dispense
    if (requirement.requiredToDispense) {
      // Figure out which stakeholder the requirement corresponds to
      const stakeholderType = requirement.stakeholderType;
      const stakeholderReference =
        stakeholderType === 'prescriber'
          ? practitionerReference
          : stakeholderType === 'pharmacist'
          ? pharmacistReference
          : patientReference;

      // Check if this stakeholder has already completed this requirement
      const existingMetReq = await metRequirementsCollection
        .findOne({
          stakeholderId: stakeholderReference,
          requirementName: requirement.name,
          drugName: drug?.name
        })
        .exec();

      if (existingMetReq) {
        // Requirement already exists (e.g., prescriber or pharmacist enrolled previously)
        pushMetRequirements(existingMetReq, remsRequest);
        existingMetReq.case_numbers.push(case_number);
        await existingMetReq.save();
      } else {
        // Create new unmet requirement
        const newMetReq = {
          completed: false,
          requirementName: requirement.name,
          requirementDescription: requirement.description,
          drugName: drug?.name,
          stakeholderId: stakeholderReference,
          case_numbers: [case_number]
        };

        if (!(await createAndPushMetRequirements(newMetReq, remsRequest))) {
          console.log('ERROR: failed to create unmet requirement for new case');
        }
      }
    }
  }

  // Save the new case
  remsRequest.status = remsRequest.metRequirements.every(req => req.completed)
    ? 'Approved'
    : 'Pending';
  const newCase = await remsCaseCollection.create(remsRequest);

  console.log(
    `Created new REMS case ${case_number} with all requirements unmet (or linked to existing)`
  );
  return newCase;
};

export const handleStakeholderChangesAndRecordEvent = async (
  remsCase: RemsCase,
  drug: Medication,
  practitionerReference: string,
  pharmacistReference: string,
  medicationRequestReference: string,
  originatingFhirServer?: string
) => {
  let stakeholdersChanged = false;

  // Record prescription event
  const prescriptionEvent = {
    medicationRequestReference: medicationRequestReference,
    prescriberId: practitionerReference,
    pharmacyId: pharmacistReference,
    timestamp: new Date(),
    originatingFhirServer: originatingFhirServer,
    caseStatusAtTime: remsCase.status
  };
  remsCase.prescriptionEvents.push(prescriptionEvent);
  remsCase.medicationRequestReference = medicationRequestReference;
  if (originatingFhirServer) {
    remsCase.originatingFhirServer = originatingFhirServer;
  }

  // Check if prescriber changed
  if (remsCase.currentPrescriberId !== practitionerReference) {
    console.log(
      `Prescriber changed from ${remsCase.currentPrescriberId} to ${practitionerReference}`
    );
    stakeholdersChanged = true;

    // Remove old prescriber requirements
    remsCase.metRequirements = remsCase.metRequirements.filter(
      req =>
        req.stakeholderId !== remsCase.currentPrescriberId ||
        !drug.requirements.some(
          r => r.name === req.requirementName && r.stakeholderType === 'prescriber'
        )
    );

    // Add new prescriber requirements
    const prescriberRequirements = drug.requirements.filter(
      r => r.stakeholderType === 'prescriber'
    );
    for (const requirement of prescriberRequirements) {
      if (requirement.requiredToDispense) {
        const existingMetReq = await metRequirementsCollection
          .findOne({
            stakeholderId: practitionerReference,
            requirementName: requirement.name,
            drugName: drug?.name
          })
          .exec();

        if (existingMetReq) {
          pushMetRequirements(existingMetReq, remsCase);
          if (!existingMetReq.case_numbers.includes(remsCase.case_number)) {
            existingMetReq.case_numbers.push(remsCase.case_number);
            await existingMetReq.save();
          }
        } else {
          const newMetReq = {
            completed: false,
            requirementName: requirement.name,
            requirementDescription: requirement.description,
            drugName: drug?.name,
            stakeholderId: practitionerReference,
            case_numbers: [remsCase.case_number]
          };
          await createAndPushMetRequirements(newMetReq, remsCase);
        }
      }
    }

    // Update prescriber tracking
    remsCase.currentPrescriberId = practitionerReference;
    if (!remsCase.prescriberHistory.includes(practitionerReference)) {
      remsCase.prescriberHistory.push(practitionerReference);
    }
  }

  // Check if pharmacy changed
  if (pharmacistReference && remsCase.currentPharmacyId !== pharmacistReference) {
    console.log(`Pharmacy changed from ${remsCase.currentPharmacyId} to ${pharmacistReference}`);
    stakeholdersChanged = true;

    // Remove old pharmacy requirements
    remsCase.metRequirements = remsCase.metRequirements.filter(
      req =>
        req.stakeholderId !== remsCase.currentPharmacyId ||
        !drug.requirements.some(
          r => r.name === req.requirementName && r.stakeholderType === 'pharmacist'
        )
    );

    // Add new pharmacy requirements
    const pharmacyRequirements = drug.requirements.filter(r => r.stakeholderType === 'pharmacist');
    for (const requirement of pharmacyRequirements) {
      if (requirement.requiredToDispense) {
        const existingMetReq = await metRequirementsCollection
          .findOne({
            stakeholderId: pharmacistReference,
            requirementName: requirement.name,
            drugName: drug?.name
          })
          .exec();

        if (existingMetReq) {
          pushMetRequirements(existingMetReq, remsCase);
          if (!existingMetReq.case_numbers.includes(remsCase.case_number)) {
            existingMetReq.case_numbers.push(remsCase.case_number);
            await existingMetReq.save();
          }
        } else {
          const newMetReq = {
            completed: false,
            requirementName: requirement.name,
            requirementDescription: requirement.description,
            drugName: drug?.name,
            stakeholderId: pharmacistReference,
            case_numbers: [remsCase.case_number]
          };
          await createAndPushMetRequirements(newMetReq, remsCase);
        }
      }
    }

    // Update pharmacy tracking
    remsCase.currentPharmacyId = pharmacistReference;
    if (!remsCase.pharmacyHistory.includes(pharmacistReference)) {
      remsCase.pharmacyHistory.push(pharmacistReference);
    }
  }

  // Recalculate status if stakeholders changed
  if (stakeholdersChanged) {
    remsCase.status = remsCase.metRequirements.every(req => req.completed) ? 'Approved' : 'Pending';
  }

  await remsCase.save();
  return remsCase;
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
  reqStakeholderReference: string,
  practitionerReference: string,
  pharmacistReference: string,
  patientReference: string,
  medicationRequestReference: string,
  originatingFhirServer?: string
) => {
  const patientFirstName = patient.name?.[0].given?.[0] || '';
  const patientLastName = patient.name?.[0].family || '';
  const patientDOB = patient.birthDate || '';
  let message = '';

  // Check if case already exists
  const existingCase = await remsCaseCollection.findOne({
    patientFirstName: patientFirstName,
    patientLastName: patientLastName,
    patientDOB: patientDOB,
    drugCode: drug?.code
  });

  if (existingCase) {
    // Case already exists - check for stakeholder changes before updating requirement
    console.log(
      `Case ${existingCase.case_number} already exists, checking for stakeholder changes`
    );

    // Check if prescriber or pharmacy changed and handle accordingly
    const prescriberChanged = existingCase.currentPrescriberId !== practitionerReference;
    const pharmacyChanged =
      pharmacistReference && existingCase.currentPharmacyId !== pharmacistReference;

    if (prescriberChanged || pharmacyChanged) {
      await handleStakeholderChangesAndRecordEvent(
        existingCase,
        drug,
        practitionerReference,
        pharmacistReference,
        medicationRequestReference,
        originatingFhirServer
      );
    }

    // Find and update the existing MetRequirement
    const matchedMetReq = await metRequirementsCollection
      .findOne({
        stakeholderId: reqStakeholderReference,
        requirementName: requirement.name,
        drugName: drug?.name
      })
      .exec();

    if (matchedMetReq) {
      // Update existing MetRequirement
      matchedMetReq.completed = true;
      matchedMetReq.completedQuestionnaire = questionnaireResponse;
      await matchedMetReq.save();

      // Update the case's metRequirements array
      const metReqArray = existingCase.metRequirements || [];
      let foundUncompleted = false;

      for (let i = 0; i < metReqArray.length; i++) {
        const req = existingCase.metRequirements[i];
        if (
          req?.requirementName === matchedMetReq.requirementName &&
          req?.stakeholderId === matchedMetReq.stakeholderId
        ) {
          metReqArray[i].completed = true;
          req!.completed = true;
          await remsCaseCollection.updateOne(
            { _id: existingCase._id },
            { $set: { metRequirements: metReqArray } }
          );
        }
        if (!req?.completed) {
          foundUncompleted = true;
        }
      }

      // Update case status if all requirements are now complete
      if (!foundUncompleted && existingCase.status === 'Pending') {
        existingCase.status = 'Approved';
        await existingCase.save();
      }

      return {
        returnedRemsRequestDoc: existingCase
      };
    } else {
      message = 'ERROR: MetRequirement not found for existing case';
      console.log(message);
      throw new Error(message);
    }
  }

  // No existing case - create new one
  const case_number = uid();

  // create new rems request and add the created metReq to it
  let remsRequestCompletedStatus = 'Approved';
  const dispenseStatusDefault = 'Pending';
  const remsRequest: Pick<
    RemsCase,
    | 'case_number'
    | 'status'
    | 'dispenseStatus'
    | 'drugName'
    | 'drugCode'
    | 'drugNdcCode'
    | 'patientFirstName'
    | 'patientLastName'
    | 'patientDOB'
    | 'medicationRequestReference'
    | 'currentPrescriberId'
    | 'currentPharmacyId'
    | 'prescriberHistory'
    | 'pharmacyHistory'
    | 'prescriptionEvents'
    | 'metRequirements'
  > & { originatingFhirServer?: string } = {
    case_number: case_number,
    status: remsRequestCompletedStatus,
    dispenseStatus: dispenseStatusDefault,
    drugName: drug?.name,
    drugCode: drug?.code,
    drugNdcCode: drug?.ndcCode,
    patientFirstName: patientFirstName,
    patientLastName: patientLastName,
    patientDOB: patientDOB,
    medicationRequestReference: medicationRequestReference,
    currentPrescriberId: practitionerReference,
    currentPharmacyId: pharmacistReference,
    prescriberHistory: [practitionerReference],
    pharmacyHistory: pharmacistReference ? [pharmacistReference] : [],
    prescriptionEvents: [
      {
        medicationRequestReference: medicationRequestReference,
        prescriberId: practitionerReference,
        pharmacyId: pharmacistReference,
        timestamp: new Date(),
        originatingFhirServer: originatingFhirServer,
        caseStatusAtTime: remsRequestCompletedStatus
      }
    ],
    originatingFhirServer: originatingFhirServer,
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
    message = 'ERROR: failed to create new met requirement and initial case';
    console.log(message);
    throw new Error(message);
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
          message = 'ERROR: failed to create new met requirement for form and initial case';
          console.log(message);
        }
      }
    }
  }

  remsRequest.status = remsRequestCompletedStatus;
  const returnedRemsRequestDoc = await remsCaseCollection.create(remsRequest);

  return {
    returnedRemsRequestDoc
  };
};

const createMetRequirementAndUpdateCase = async (
  drug: Medication,
  requirement: Requirement,
  questionnaireResponse: QuestionnaireResponse,
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
            req4!.completed = true;
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

  return {
    returnedMetReqDoc
  };
};

const createMetRequirementAndUpdateCaseNotRequiredToDispense = async (
  patient: Patient,
  drug: Medication,
  requirement: Requirement,
  questionnaireResponse: QuestionnaireResponse,
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

  if (returnRemsRequest) {
    return {
      remsRequestToUpdate
    };
  } else {
    return {
      message
    };
  }
};

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

export const processQuestionnaireResponseSubmission = async (requestBody: Bundle): Promise<any> => {
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
          return await createMetRequirementAndNewCase(
            patient,
            drug,
            requirement,
            questionnaireResponse,
            stakeholderReference,
            practitionerReference,
            pharmacistReference,
            patientReference,
            prescriptionReference
          );
        } else {
          // If it's not the patient status requirement
          if (requirement.requiredToDispense) {
            return await createMetRequirementAndUpdateCase(
              drug,
              requirement,
              questionnaireResponse,
              stakeholderReference
            );
          } else {
            return await createMetRequirementAndUpdateCaseNotRequiredToDispense(
              patient,
              drug,
              requirement,
              questionnaireResponse,
              stakeholderReference
            );
          }
        }
      }
    }
  }

  throw new Error('No matching requirement found for the submitted questionnaire');
};

export { getResource, getQuestionnaireResponse };

export default router;
