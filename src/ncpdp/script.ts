import { Router, Request, Response } from 'express';
import { remsCaseCollection, medicationCollection } from '../fhir/models';
import container from '../lib/winston';
import { Builder } from 'xml2js';
import { sendCommunicationToEHR } from '../lib/communication';

const router = Router();
const logger = container.get('application');

router.post('/', async (req: Request, res: Response) => {
  try {
    const parsedMessage = req.body;

    logger.info('=== NCPDP Request Received ===');

    const message = parsedMessage.message;
    const body = message?.body;

    const messageInfo = {
      hasRemsRequest: !!body?.remsrequest,
      hasRemsInitiation: !!body?.remsinitiationrequest,
      hasRxFill: !!body?.rxfill,
      bodyKeys: body ? Object.keys(body).join(', ') : 'no body'
    };
    logger.info(`Message type check: ${JSON.stringify(messageInfo)}`);

    if (body?.remsrequest) {
      logger.info('Routing to handleRemsRequest');
      await handleRemsRequest(message, res);
    } else if (body?.remsinitiationrequest) {
      logger.info('Routing to handleRemsInitiation');
      await handleRemsInitiation(message, res);
    } else if (body?.rxfill) {
      logger.info('Routing to handleRxFill');
      await handleRxFill(message, res);
    } else {
      logger.error('Unknown NCPDP message type');
      res.type('application/xml');
      res.status(400).send(buildErrorResponse('Unknown message type'));
    }
  } catch (error: any) {
    logger.error(`ERROR processing NCPDP message: ${error.message}`);
    logger.error(`Stack: ${error.stack}`);
    res.type('application/xml');
    res.status(500).send(buildErrorResponse('Internal server error'));
  }
});

const handleRemsRequest = async (message: any, res: Response) => {
  try {
    logger.info('--- handleRemsRequest started ---');

    const header = message.header;
    const remsRequest = message.body.remsrequest;
    const caseId = remsRequest.request?.solicitedmodel?.remscaseid;

    logger.info(`Extracted case ID: ${caseId}`);

    if (!caseId) {
      logger.error('Case ID not provided in request');
      res.type('application/xml');
      return res
        .status(200)
        .send(buildDeniedResponse(header, remsRequest, 'EC', 'Case ID not provided'));
    }

    if (typeof caseId !== 'string' || caseId.trim().length === 0) {
      logger.error('Invalid Case ID type or value in request');
      res.type('application/xml');
      return res
        .status(200)
        .send(buildDeniedResponse(header, remsRequest, 'EC', 'Invalid case ID'));
    }

    logger.info(`Looking up case: ${caseId}`);

    const remsCase = await remsCaseCollection.findOne({ case_number: caseId });

    if (!remsCase) {
      logger.error(`Case not found: ${caseId}`);
      res.type('application/xml');
      return res.status(200).send(buildDeniedResponse(header, remsRequest, 'EC', 'Case not found'));
    }

    const caseInfo = {
      case_number: remsCase.case_number,
      status: remsCase.status,
      drugName: remsCase.drugName,
      drugNdcCode: remsCase.drugNdcCode,
      numRequirements: remsCase.metRequirements?.length
    };
    logger.info(`Case found: ${JSON.stringify(caseInfo)}`);

    const medication = await medicationCollection.findOne({
      ndcCode: remsCase.drugNdcCode
    });

    if (!medication) {
      logger.error(`Medication configuration not found for NDC: ${remsCase.drugNdcCode}`);
      res.type('application/xml');
      return res
        .status(200)
        .send(buildDeniedResponse(header, remsRequest, 'ER', 'Medication configuration error'));
    }

    const medInfo = {
      name: medication.name,
      ndcCode: medication.ndcCode,
      totalRequirements: medication.requirements.length,
      requiredToDispense: medication.requirements.filter((r: any) => r.requiredToDispense).length
    };
    logger.info(`Medication found: ${JSON.stringify(medInfo)}`);

    // Check if all requiredToDispense requirements are met
    const requiredRequirements = medication.requirements.filter(
      (req: any) => req.requiredToDispense
    );
    const outstandingRequirements: any[] = [];

    logger.info('Checking requirements...');

    for (const requirement of requiredRequirements) {
      const matchingMetReq = remsCase.metRequirements?.find(
        (mr: any) => mr.requirementName === requirement.name
      );

      const isComplete = matchingMetReq && matchingMetReq.completed;
      logger.info(`  Requirement: ${requirement.name} - ${isComplete ? 'COMPLETE' : 'INCOMPLETE'}`);

      if (!matchingMetReq || !matchingMetReq.completed) {
        outstandingRequirements.push({
          name: requirement.name,
          stakeholder: requirement.stakeholderType,
          requirement: requirement
        });
      }
    }

    // If all requirements met, approve
    if (outstandingRequirements.length === 0) {
      logger.info('All requirements met - APPROVING');
      const authNumber = `RDA${Math.floor(Math.random() * 10000000)}`;
      const today = new Date();
      const expirationDate = new Date(today);
      expirationDate.setDate(expirationDate.getDate() + 7);

      const authDetails = {
        authNumber,
        effectiveDate: today.toISOString().split('T')[0],
        expirationDate: expirationDate.toISOString().split('T')[0]
      };
      logger.info(`Authorization details: ${JSON.stringify(authDetails)}`);

      res.type('application/xml');
      return res
        .status(200)
        .send(
          buildApprovedResponse(
            header,
            remsRequest,
            caseId,
            authNumber,
            today.toISOString().split('T')[0],
            expirationDate.toISOString().split('T')[0]
          )
        );
    }

    // Requirements not met - denial with reason code
    const reasonCode = determineReasonCode(outstandingRequirements);
    const reasonText = buildReasonText(reasonCode);

    const denialDetails = {
      reasonCode: reasonCode,
      reasonText,
      outstandingCount: outstandingRequirements.length
    };
    logger.info(`Denial details: ${JSON.stringify(denialDetails)}`);

    // Send Communication to EHR with outstanding requirements
    logger.info('Attempting to send Communication to EHR...');
    try {
      await sendCommunicationToEHR(remsCase, medication, outstandingRequirements);
      const ehrEndpoint = remsCase.originatingFhirServer || 'default server';
      logger.info(`Communication sent successfully to: ${ehrEndpoint}`);
    } catch (commError: any) {
      logger.error(`Failed to send Communication: ${commError.message}`);
    }

    logger.info('Sending DENIED response');
    res.type('application/xml');
    return res.status(200).send(buildDeniedResponse(header, remsRequest, reasonCode, reasonText));
  } catch (error: any) {
    logger.error(`ERROR in handleRemsRequest: ${error.message}`);
    logger.error(`Stack trace: ${error.stack}`);
    res.type('application/xml');
    return res.status(500).send(buildErrorResponse(error.message));
  }
};

const handleRemsInitiation = async (message: any, res: Response) => {
  try {
    logger.info('--- handleRemsInitiation started ---');
    const header = message.header;
    const initRequest = message.body.remsinitiationrequest;
    const patient = initRequest.patient?.humanpatient;
    //const prescriber = initRequest.prescriber?.nonveterinarian;
    //const pharmacy = initRequest.pharmacy;
    const drugNdcCode = initRequest.medicationprescribed?.product?.drugcoded?.ndc;

    const requestInfo = {
      patientName: `${patient?.names?.name?.firstname} ${patient?.names?.name?.lastname}`,
      drugNdcCode: drugNdcCode
    };
    logger.info(`REMS Initiation request: ${JSON.stringify(requestInfo)}`);

    const remsCase = await remsCaseCollection.findOne({
      patientFirstName: patient?.names?.name?.firstname,
      patientLastName: patient?.names?.name?.lastname,
      patientDOB: patient?.dateofbirth?.date,
      drugNdcCode: drugNdcCode
    });

    if (!remsCase) {
      logger.info('No case exists - patient must enroll');
      res.type('application/xml');
      return res
        .status(200)
        .send(
          buildInitiationClosedResponse(header, initRequest, 'EM', 'Patient must enroll/certify')
        );
    }

    // Case exists - check requirements
    const medication = await medicationCollection.findOne({
      ndcCode: drugNdcCode
    });

    if (!medication) {
      logger.error(`Medication not found for NDC: ${drugNdcCode}`);
      res.type('application/xml');
      return res
        .status(200)
        .send(
          buildInitiationClosedResponse(header, initRequest, 'ER', 'Medication configuration error')
        );
    }

    // Check for outstanding requirements
    const requiredRequirements = medication.requirements.filter(req => req.requiredToDispense);
    const outstandingRequirements: any[] = [];

    for (const requirement of requiredRequirements) {
      const matchingMetReq = remsCase.metRequirements?.find(
        mr => mr.requirementName === requirement.name
      );

      if (!matchingMetReq || !matchingMetReq.completed) {
        outstandingRequirements.push({
          name: requirement.name,
          stakeholder: requirement.stakeholderType
        });
      }
    }

    if (outstandingRequirements.length > 0) {
      const reasonCode = determineReasonCode(outstandingRequirements);
      const reasonText = buildReasonText(reasonCode);

      logger.info(`Requirements not met - closing with: ${reasonCode}`);
      res.type('application/xml');
      return res
        .status(200)
        .send(buildInitiationClosedResponse(header, initRequest, reasonCode, reasonText));
    }

    // All requirements met - return success with patient ID
    logger.info('All requirements met - returning success');
    res.type('application/xml');
    return res.status(200).send(buildInitiationSuccessResponse(header, initRequest, remsCase));
  } catch (error: any) {
    logger.error(`ERROR in handleRemsInitiation: ${error.message}`);
    res.type('application/xml');
    return res.status(500).send(buildErrorResponse(error.message));
  }
};

const handleRxFill = async (message: any, res: Response) => {
  try {
    logger.info('--- handleRxFill started ---');
    const header = message.header;
    const rxFill = message.body.rxfill;
    const patient = rxFill.patient?.humanpatient;

    const medicationDispensed = rxFill.medicationdispensed;

    if (!medicationDispensed) {
      logger.error('MedicationDispensed not found in RxFill message');
      logger.error(`Available RxFill fields: ${JSON.stringify(Object.keys(rxFill))}`);
    }

    const drugNdcCode = medicationDispensed?.drugcoded?.productcode?.code;

    const patientInfo = {
      firstName: patient?.name?.firstname || patient?.names?.name?.firstname,
      lastName: patient?.name?.lastname || patient?.names?.name?.lastname,
      dob: patient?.dateofbirth?.date,
      ndc: drugNdcCode
    };

    logger.info(`RxFill received for: ${JSON.stringify(patientInfo)}`);

    // Try to find case - if NDC not available, try by patient + drug description
    let remsCase = null;

    if (drugNdcCode) {
      remsCase = await remsCaseCollection.findOne({
        patientFirstName: patientInfo.firstName,
        patientLastName: patientInfo.lastName,
        patientDOB: patientInfo.dob,
        drugNdcCode: drugNdcCode
      });
    }

    if (remsCase) {
      remsCase.dispenseStatus = 'Dispensed';
      await remsCase.save();

      logger.info(`Updated case ${remsCase.case_number} dispense status to 'Dispensed'`);
      logger.info(`  Patient: ${remsCase.patientFirstName} ${remsCase.patientLastName}`);
      logger.info(`  Drug: ${remsCase.drugName} (NDC: ${remsCase.drugNdcCode})`);
      logger.info(`  Case Status: ${remsCase.status}`);
    } else {
      logger.warn('Case not found for RxFill notification');
      logger.warn(`  Searched for: ${JSON.stringify(patientInfo)}`);
    }

    // Return success status per NCPDP
    res.type('application/xml');
    return res.status(200).send(buildRxFillResponse(header, rxFill));
  } catch (error: any) {
    logger.error(`ERROR in handleRxFill: ${error.message}`);
    logger.error(`Stack trace: ${error.stack}`);
    res.type('application/xml');
    return res.status(500).send(buildErrorResponse(error.message));
  }
};

const determineReasonCode = (outstandingRequirements: any[]): string => {
  let hasPatientReq = false;
  let hasPrescriberReq = false;
  let hasPharmacyReq = false;

  for (const req of outstandingRequirements) {
    const stakeholder = req.stakeholder?.toLowerCase();
    if (stakeholder === 'patient') {
      hasPatientReq = true;
    } else if (stakeholder === 'prescriber') {
      hasPrescriberReq = true;
    } else if (stakeholder === 'pharmacist' || stakeholder === 'pharmacy') {
      hasPharmacyReq = true;
    }
  }

  // Return only the highest priority requirement
  if (hasPatientReq) {
    return 'EM';
  } else if (hasPrescriberReq) {
    return 'ES';
  } else if (hasPharmacyReq) {
    return 'EO';
  }

  // Fallback - should not reach here
  return 'EC';
};

const buildReasonText = (reasonCode: string): string => {
  const reasonCodeNotes: { [key: string]: string } = {
    EM: 'Patient enrollment/certification required',
    ES: 'Prescriber enrollment/certification required',
    EO: 'Pharmacy enrollment/certification required',
    EC: 'Case information incomplete or invalid',
    ER: 'REMS program error',
    EX: 'Prescriber deactivated/decertified',
    EY: 'Pharmacy deactivated/decertified',
    EZ: 'Patient deactivated/decertified'
  };

  return reasonCodeNotes[reasonCode] || 'REMS requirement not met';
};

const buildApprovedResponse = (
  header: any,
  request: any,
  caseId: string,
  authNumber: string,
  effectiveDate: string,
  expirationDate: string
): string => {
  const builder = new Builder({ headless: false });

  const patient = request.patient;
  const pharmacy = request.pharmacy;
  const prescriber = request.prescriber;
  const medicationPrescribed = request.medicationprescribed;
  const remsReferenceID = request.remsreferenceid;

  const response = {
    Message: {
      $: {
        'xmlns:xsi': 'http://www.w3.org/2001/XMLSchema-instance',
        DatatypesVersion: 'V2024071',
        TransportVersion: 'V2024071',
        TransactionDomain: 'SCRIPT',
        TransactionVersion: 'V2024071',
        StructuresVersion: 'V2024071',
        ECLVersion: 'V2024071'
      },
      Header: header,
      Body: {
        REMSResponse: {
          REMSReferenceID: remsReferenceID,
          Patient: patient,
          Pharmacy: pharmacy,
          Prescriber: prescriber,
          MedicationPrescribed: medicationPrescribed,
          Response: {
            ResponseStatus: {
              Approved: {
                REMSCaseID: caseId,
                REMSAuthorizationNumber: authNumber,
                AuthorizationPeriod: {
                  EffectiveDate: { Date: effectiveDate },
                  ExpirationDate: { Date: expirationDate }
                }
              }
            }
          }
        }
      }
    }
  };

  return builder.buildObject(response);
};

const buildDeniedResponse = (
  header: any,
  request: any,
  reasonCode: string,
  note: string
): string => {
  const builder = new Builder({ headless: false });

  const patient = request.patient;
  const pharmacy = request.pharmacy;
  const prescriber = request.prescriber;
  const medicationPrescribed = request.medicationprescribed;
  const remsReferenceID = request.remsreferenceid;
  const solicitedModel = request.request?.solicitedmodel;
  const caseId = solicitedModel?.remscaseid;

  const response = {
    Message: {
      $: {
        'xmlns:xsi': 'http://www.w3.org/2001/XMLSchema-instance',
        DatatypesVersion: 'V2024071',
        TransportVersion: 'V2024071',
        TransactionDomain: 'SCRIPT',
        TransactionVersion: 'V2024071',
        StructuresVersion: 'V2024071',
        ECLVersion: 'V2024071'
      },
      Header: header,
      Body: {
        REMSResponse: {
          REMSReferenceID: remsReferenceID,
          Patient: patient,
          Pharmacy: pharmacy,
          Prescriber: prescriber,
          MedicationPrescribed: medicationPrescribed,
          Response: {
            ResponseStatus: {
              Denied: {
                REMSCaseID: caseId,
                DeniedReasonCode: reasonCode,
                REMSNote: note
              }
            }
          }
        }
      }
    }
  };

  return builder.buildObject(response);
};

const buildInitiationClosedResponse = (
  header: any,
  request: any,
  reasonCode: string,
  note: string
): string => {
  const builder = new Builder({ headless: false });

  const patient = request.patient;
  const pharmacy = request.pharmacy;
  const prescriber = request.prescriber;
  const medicationPrescribed = request.medicationprescribed;
  const remsReferenceID = request.remsreferenceid;

  const response = {
    Message: {
      $: {
        'xmlns:xsi': 'http://www.w3.org/2001/XMLSchema-instance',
        DatatypesVersion: 'V2024071',
        TransportVersion: 'V2024071',
        TransactionDomain: 'SCRIPT',
        TransactionVersion: 'V2024071',
        StructuresVersion: 'V2024071',
        ECLVersion: 'V2024071'
      },
      Header: header,
      Body: {
        REMSInitiationResponse: {
          REMSReferenceID: remsReferenceID,
          Patient: patient,
          Pharmacy: pharmacy,
          Prescriber: prescriber,
          MedicationPrescribed: medicationPrescribed,
          Response: {
            ResponseStatus: {
              Closed: {
                ReasonCode: reasonCode,
                REMSNote: note
              }
            }
          }
        }
      }
    }
  };

  return builder.buildObject(response);
};

const buildInitiationSuccessResponse = (header: any, request: any, remsCase: any): string => {
  const builder = new Builder({ headless: false });

  const patient = request.patient;
  const humanPatient = patient?.humanpatient;
  const pharmacy = request.pharmacy;
  const prescriber = request.prescriber;
  const medicationPrescribed = request.medicationprescribed;
  const remsReferenceID = request.remsreferenceid;

  const response = {
    Message: {
      $: {
        'xmlns:xsi': 'http://www.w3.org/2001/XMLSchema-instance',
        DatatypesVersion: 'V2024071',
        TransportVersion: 'V2024071',
        TransactionDomain: 'SCRIPT',
        TransactionVersion: 'V2024071',
        StructuresVersion: 'V2024071',
        ECLVersion: 'V2024071'
      },
      Header: header,
      Body: {
        REMSInitiationResponse: {
          REMSReferenceID: remsReferenceID,
          Patient: {
            HumanPatient: {
              $: {
                'xsi:type': 'PatientMandatoryAddress'
              },
              Identification: {
                REMSPatientID: remsCase.remsPatientId || remsCase.case_number
              },
              Names: humanPatient?.names,
              GenderAndSex: humanPatient?.genderandsex,
              DateOfBirth: humanPatient?.dateofbirth,
              Address: {
                $: {
                  'xsi:type': 'MandatoryAddressType'
                },
                ...humanPatient?.address
              }
            }
          },
          Pharmacy: pharmacy,
          Prescriber: prescriber,
          MedicationPrescribed: medicationPrescribed
        }
      }
    }
  };

  return builder.buildObject(response);
};

const buildRxFillResponse = (header: any, rxFill: any): string => {
  const builder = new Builder({ headless: false });

  const response = {
    Message: {
      $: {
        'xmlns:xsi': 'http://www.w3.org/2001/XMLSchema-instance',
        DatatypesVersion: 'V2024071',
        TransportVersion: 'V2024071',
        TransactionDomain: 'SCRIPT',
        TransactionVersion: 'V2024071',
        StructuresVersion: 'V2024071',
        ECLVersion: 'V2024071'
      },
      Header: header,
      Body: {
        Status: {
          Code: '000',
          Description: 'Dispense notification received and processed'
        }
      }
    }
  };

  return builder.buildObject(response);
};

const buildErrorResponse = (errorMessage: string): string => {
  const builder = new Builder({ headless: false });

  const response = {
    Message: {
      $: {
        'xmlns:xsi': 'http://www.w3.org/2001/XMLSchema-instance',
        DatatypesVersion: 'V2024071',
        TransportVersion: 'V2024071',
        TransactionDomain: 'SCRIPT',
        TransactionVersion: 'V2024071',
        StructuresVersion: 'V2024071',
        ECLVersion: 'V2024071'
      },
      Body: {
        Error: {
          Code: 'ER',
          Description: errorMessage
        }
      }
    }
  };

  return builder.buildObject(response);
};

export default router;
