import { Router, Request, Response } from 'express';
import { remsCaseCollection, medicationCollection } from '../fhir/models';
import container from '../lib/winston';
import { Builder } from 'xml2js';
import { sendCommunicationToEHR } from '../lib/communication';

const router = Router();
const logger = container.get('application');

router.post('/', async (req: Request, res: Response) => {
  try {
    // req.body is already parsed by body-parser-xml middleware
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
    
    // Route based on message type (tags are lowercase due to normalizeTags: true)
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
      res.status(400).send(buildErrorResponse('Unknown message type'));
    }
  } catch (error: any) {
    logger.error(`ERROR processing NCPDP message: ${error.message}`);
    logger.error(`Stack: ${error.stack}`);
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
      return res.status(200).send(buildDeniedResponse(header, remsRequest, 'EC', 'Case ID not provided'));
    }
    
    logger.info(`Looking up case: ${caseId}`);
    
    // Find the REMS case
    const remsCase = await remsCaseCollection.findOne({ case_number: caseId });
    
    if (!remsCase) {
      logger.error(`Case not found: ${caseId}`);
      return res.status(200).send(buildDeniedResponse(header, remsRequest, 'EC', 'Case not found'));
    }
    
    const caseInfo = {
      case_number: remsCase.case_number,
      status: remsCase.status,
      drugName: remsCase.drugName,
      drugCode: remsCase.drugCode,
      numRequirements: remsCase.metRequirements?.length
    };
    logger.info(`Case found: ${JSON.stringify(caseInfo)}`);
    
    // Get medication requirements
    const medication = await medicationCollection.findOne({
      code: remsCase.drugCode,
      name: remsCase.drugName
    });
    
    if (!medication) {
      logger.error(`Medication configuration not found: code=${remsCase.drugCode}, name=${remsCase.drugName}`);
      return res.status(200).send(buildDeniedResponse(header, remsRequest, 'ER', 'Medication configuration error'));
    }
    
    const medInfo = {
      name: medication.name,
      code: medication.code,
      totalRequirements: medication.requirements.length,
      requiredToDispense: medication.requirements.filter((r: any) => r.requiredToDispense).length
    };
    logger.info(`Medication found: ${JSON.stringify(medInfo)}`);
    
    // Check if all requiredToDispense requirements are met
    const requiredRequirements = medication.requirements.filter((req: any) => req.requiredToDispense);
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
      expirationDate.setDate(expirationDate.getDate() + 7); // 7-day authorization window
      
      const authDetails = {
        authNumber,
        effectiveDate: today.toISOString().split('T')[0],
        expirationDate: expirationDate.toISOString().split('T')[0]
      };
      logger.info(`Authorization details: ${JSON.stringify(authDetails)}`);
      
      return res.status(200).send(buildApprovedResponse(
        header,
        remsRequest,
        caseId,
        authNumber,
        today.toISOString().split('T')[0],
        expirationDate.toISOString().split('T')[0]
      ));
    }
    
    // Requirements not met - determine reason codes and send Communication
    logger.info(`${outstandingRequirements.length} requirements not met - DENYING`);
    const reasonCodes = determineReasonCodes(outstandingRequirements);
    const reasonText = buildReasonText(outstandingRequirements);
    
    const denialDetails = {
      reasonCodes: reasonCodes.join(','),
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
      // Continue with denial response even if Communication fails
    }
    
    logger.info('Sending DENIED response');
    return res.status(200).send(buildDeniedResponse(header, remsRequest, reasonCodes.join(','), reasonText));
    
  } catch (error: any) {
    logger.error(`ERROR in handleRemsRequest: ${error.message}`);
    logger.error(`Stack trace: ${error.stack}`);
    return res.status(500).send(buildErrorResponse(error.message));
  }
};


const handleRemsInitiation = async (message: any, res: Response) => {
  try {
    logger.info('--- handleRemsInitiation started ---');
    const header = message.header;
    const initRequest = message.body.remsinitiationrequest;
    const patient = initRequest.patient?.humanpatient;
    const prescriber = initRequest.prescriber?.nonveterinarian;
    const pharmacy = initRequest.pharmacy;
    const drugCode = initRequest.medicationprescribed?.product?.drugcoded?.ndc;
    
    const requestInfo = {
      patientName: `${patient?.names?.name?.firstname} ${patient?.names?.name?.lastname}`,
      drugCode
    };
    logger.info(`REMS Initiation request: ${JSON.stringify(requestInfo)}`);
    
    // Look up patient's REMS case
    const remsCase = await remsCaseCollection.findOne({
      patientFirstName: patient?.names?.name?.firstname,
      patientLastName: patient?.names?.name?.lastname,
      patientDOB: patient?.dateofbirth?.date,
      drugNdcCode: drugCode
    });
    
    if (!remsCase) {
      // No case exists - return "Closed" with EM (patient must enroll)
      return res.status(200).send(buildInitiationClosedResponse(
        header,
        initRequest,
        'EM',
        'Patient must enroll/certify'
      ));
    }
    
    // Case exists - check requirements
    const medication = await medicationCollection.findOne({ code: drugCode });
    
    if (!medication) {
      return res.status(200).send(buildInitiationClosedResponse(
        header,
        initRequest,
        'ER',
        'Medication configuration error'
      ));
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
      const reasonCodes = determineReasonCodes(outstandingRequirements);
      const reasonText = buildReasonText(outstandingRequirements);
      
      return res.status(200).send(buildInitiationClosedResponse(
        header,
        initRequest,
        reasonCodes.join(','),
        reasonText
      ));
    }
    
    // All requirements met - return success with patient ID
    return res.status(200).send(buildInitiationSuccessResponse(header, initRequest, remsCase));
    
  } catch (error: any) {
    logger.error(`ERROR in handleRemsInitiation: ${error.message}`);
    return res.status(500).send(buildErrorResponse(error.message));
  }
};


const handleRxFill = async (message: any, res: Response) => {
  try {
    logger.info('--- handleRxFill started ---');
    const rxFill = message.body.rxfill;
    const patient = rxFill.patient?.humanpatient;
    const drugCode = rxFill.medicationprescribed?.product?.drugcoded?.ndc;
    const fillStatus = rxFill.fillstatus?.dispensed?.note || 'Dispensed';
    
    const rxFillInfo = {
      patientName: `${patient?.names?.name?.firstname} ${patient?.names?.name?.lastname}`,
      patientDOB: patient?.dateofbirth?.date,
      drugCode,
      fillStatus
    };
    logger.info(`RxFill notification: ${JSON.stringify(rxFillInfo)}`);
    
    // Update case dispense status
    const updatedCase = await remsCaseCollection.findOneAndUpdate(
      {
        patientFirstName: patient?.names?.name?.firstname,
        patientLastName: patient?.names?.name?.lastname,
        patientDOB: patient?.dateofbirth?.date,
        drugNdcCode: drugCode
      },
      { dispenseStatus: fillStatus },
      { new: true }
    );
    
    if (updatedCase) {
      logger.info(`Updated dispense status for case ${updatedCase.case_number}: ${fillStatus}`);
    } else {
      logger.warn('No matching case found to update');
    }
    
    logger.info('Sending RxFill acknowledgment');
    // Simple acknowledgment response
    res.status(200).send(buildRxFillResponse(message.header, rxFill));
    
  } catch (error: any) {
    logger.error(`ERROR in handleRxFill: ${error.message}`);
    return res.status(500).send(buildErrorResponse(error.message));
  }
};

const determineReasonCodes = (outstandingRequirements: any[]): string[] => {
  const codes = new Set<string>();
  
  for (const req of outstandingRequirements) {
    switch (req.stakeholder) {
      case 'patient':
        codes.add('EM'); // Patient must enroll/certify
        break;
      case 'prescriber':
        codes.add('ES'); // Prescriber must enroll/certify
        break;
      case 'pharmacist':
      case 'pharmacy':
        codes.add('EO'); // Pharmacy not enrolled/certified
        break;
    }
  }
  
  return Array.from(codes);
};


const buildReasonText = (outstandingRequirements: any[]): string => {
  const reqNames = outstandingRequirements.map(r => `${r.name} (${r.stakeholder})`).join(', ');
  return `Outstanding REMS requirements: ${reqNames}`;
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
          REMSReferenceID: request.REMSReferenceID,
          Patient: request.Patient,
          Pharmacy: request.Pharmacy,
          Prescriber: request.Prescriber,
          MedicationPrescribed: request.MedicationPrescribed,
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
          REMSReferenceID: request.REMSReferenceID,
          Patient: request.Patient,
          Pharmacy: request.Pharmacy,
          Prescriber: request.Prescriber,
          MedicationPrescribed: request.MedicationPrescribed,
          Response: {
            ResponseStatus: {
              Denied: {
                REMSCaseID: request.request?.solicitedmodel?.remscaseid,
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
          REMSReferenceID: request.REMSReferenceID,
          Patient: request.Patient,
          Pharmacy: request.Pharmacy,
          Prescriber: request.Prescriber,
          MedicationPrescribed: request.MedicationPrescribed,
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
          REMSReferenceID: request.REMSReferenceID,
          Patient: {
            ...request.Patient,
            HumanPatient: {
              ...request.Patient.HumanPatient,
              Identification: {
                REMSPatientID: remsCase.case_number // Return case number as patient ID
              }
            }
          },
          Pharmacy: request.Pharmacy,
          Prescriber: request.Prescriber,
          MedicationPrescribed: request.MedicationPrescribed
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
          Code: '000', // Success code
          Description: 'Dispense notification received'
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