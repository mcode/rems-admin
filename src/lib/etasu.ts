import { Router, Response, Request } from 'express';
import { FhirUtilities } from '../fhir/utilities';
import {
  medicationCollection,
  metRequirementsCollection,
  remsCaseCollection
} from '../fhir/models';
import { uid } from 'uid';
const router = Router();

// const medicationCollection = db.collection('medication-requirements');
// const metRequirementsCollection = db.collection('met-requirements');
// const remsCaseCollection = db.collection('rems-case');

// etasu endpoints
router.get('/:drug', (req: Request, res: Response) => {
  medicationCollection.findOne({ name: req.params.drug }, (err: any, drug: any) => {
    if (err) throw err;
    res.send(drug);
  });
});

router.get('/met/:caseId', (req: Request, res: Response) => {
  remsCaseCollection.findOne({ case_number: req.params.caseId }, (err: any, remsCase: any) => {
    if (err) throw err;
    res.send(remsCase);
  });
});

router.get(
  '/met/patient/:patientFirstName/:patientLastName/:patientDOB/drug/:drugName',
  (req: Request, res: Response) => {
    const searchDict = {
      patientFirstName: req.params.patientFirstName,
      patientLastName: req.params.patientLastName,
      patientDOB: req.params.patientDOB,
      drugName: req.params.drugName
    };

    remsCaseCollection.findOne(searchDict, (err: any, remsCase: any) => {
      if (err) throw err;
      res.send(remsCase);
    });
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

router.post('/met', async (req: Request, res: Response) => {
  try {
    let returnedRemsRequestDoc: any;
    let returnedMetReqDoc: any;
    let returnRemsRequest = false;
    const requestBody = req.body;

    // extract params and questionnaire response identifier
    const params = getResource(
      requestBody,
      requestBody.entry[0].resource.focus.parameters.reference
    );
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
        prescriptionReference = param.reference;
      } else if (param.name === 'prescriber') {
        practitionerReference = param.reference;
      } else if (param.name === 'pharmacy') {
        pharmacistReference = param.reference;
      } else if (param.name === 'source-patient') {
        patientReference = param.reference;
      }
    }

    // obtain drug information from database
    const presciption = getResource(requestBody, prescriptionReference);
    const prescriptionSystem = presciption.medicationCodeableConcept.coding[0].system;
    const prescriptionCode = presciption.medicationCodeableConcept.coding[0].code;
    const patient = getResource(requestBody, patientReference);
    const patientFirstName = patient.name[0].given[0];
    const patientLastName = patient.name[0].family;
    const patientDOB = patient.birthDate;

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
            returnRemsRequest = true;
            const case_number = uid();

            // create new rems request and add the created metReq to it
            let remsRequestCompletedStatus = 'Approved';
            const remsRequest: any = {
              case_number: case_number,
              status: remsRequestCompletedStatus,
              drugName: drug?.name,
              drugCode: prescriptionCode,
              patientFirstName: patientFirstName,
              patientLastName: patientLastName,
              patientDOB: patientDOB,
              metRequirements: []
            };
            returnRemsRequest = true;

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

            try {
              const matchedMetReq = await metRequirementsCollection.create(metReq);
              remsRequest.metRequirements.push({
                stakeholderId: matchedMetReq?.stakeholderId,
                completed: matchedMetReq?.completed,
                metRequirementId: matchedMetReq?._id,
                requirementName: matchedMetReq?.requirementName,
                requirementDescription: matchedMetReq?.requirementDescription
              });
            } catch {
              console.log('create error');
            }

            // iterate through all other reqs again to create corresponding false metReqs / assign to existing
            if (drug) {
              for (const requirement2 of drug.requirements) {
                // skip if the req found is the same as in the outer loop and has already been processed
                if (!(requirement2.resourceId === requirementId)) {
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
                    remsRequest.metRequirements.push({
                      stakeholderId: matchedMetReq2.stakeholderId,
                      completed: matchedMetReq2.completed,
                      metRequirementId: matchedMetReq2._id,
                      requirementName: matchedMetReq2.requirementName,
                      requirementDescription: matchedMetReq2.requirementDescription
                    });
                    if (!matchedMetReq2.completed) {
                      remsRequestCompletedStatus = 'Pending';
                    }
                    matchedMetReq2.case_numbers.push(case_number);
                    await matchedMetReq2.save();
                    // await metRequirementsCollection.findByIdAndUpdate(matchedMetReq2, {
                    //   $addToSet: { case_numbers: case_number }
                    // });
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

                    // TODO: make this check more robust
                    try {
                      const newMetReqDoc = await metRequirementsCollection.create(newMetReq);
                      remsRequest.metRequirements.push({
                        stakeholderId: newMetReqDoc?.stakeholderId,
                        completed: newMetReqDoc?.completed,
                        metRequirementId: newMetReqDoc?._id,
                        requirementName: newMetReqDoc?.requirementName,
                        requirementDescription: newMetReqDoc?.requirementDescription
                      });
                    } catch {
                      console.log('create error');
                    }
                  }
                }
              }
            }

            remsRequest.status = remsRequestCompletedStatus;
            returnedRemsRequestDoc = await remsCaseCollection.create(remsRequest);
          } else {
            const matchedMetReq3 = await metRequirementsCollection
              .findOne({
                stakeholderId: reqStakeholderReference,
                requirementName: requirement.name,
                drugName: drug?.name
              })
              .exec();
            if (matchedMetReq3) {
              if (!matchedMetReq3.completed) {
                matchedMetReq3.completed = true;
                matchedMetReq3.completedQuestionnaire = questionnaireResponse;
                await matchedMetReq3.save();
                // await metRequirementsCollection.findByIdAndUpdate(matchedMetReq3, {
                //   $set: { completed: true, completedQuestionnaire: questionnaireResponse }
                // });

                returnedMetReqDoc = await metRequirementsCollection
                  .findOne({
                    _id: matchedMetReq3._id
                  })
                  .exec();

                // this should be an array returned via .find() - tried using $in but could not get it to work - using the first element for now as a work around since we only have one patient
                const remsRequestToUpdate = await remsCaseCollection
                  .findOne({
                    case_number: returnedMetReqDoc.case_numbers[0]
                  })
                  .exec();

                // ToDO: iterate over multiple remsRequests - right now there will only be one that matches, but with multiple patients in the system there could be more

                // for (let remsRequestToUpdate of remsRequestsToUpdate) {
                let foundUncompleted = false;
                const metReqArray = remsRequestToUpdate?.metRequirements;
                for (let i = 0; i < remsRequestToUpdate?.metRequirements.length; i++) {
                  const req4 = remsRequestToUpdate?.metRequirements[i];
                  // _id comparison would not work for some reason
                  if (req4.requirementName === matchedMetReq3.requirementName) {
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
                  // await remsCaseCollection.findByIdAndUpdate(remsRequestToUpdate, {
                  //   $set: { status: 'Approved' }
                  // });
                }

                // }
              }
            } else {
              // create the metReq that was submitted
              const newMetReq3 = {
                completed: true,
                completedQuestionnaire: questionnaireResponse,
                requirementName: requirement.name,
                requirementDescription: requirement.requirementDescription,
                drugName: drug?.name,
                stakeholderId: reqStakeholderReference,
                case_numbers: []
              };

              returnedMetReqDoc = await metRequirementsCollection.create(newMetReq3);
            }
          }
          break;
        }
      }
    }

    // return MetReq unless a new case is created in which case return the Rems request
    if (returnRemsRequest) {
      res.status(201);
      res.send(returnedRemsRequestDoc);
    } else {
      res.status(201);
      res.send(returnedMetReqDoc);
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
