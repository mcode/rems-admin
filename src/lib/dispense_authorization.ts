import { Router, Response, Request } from 'express';
import {
  medicationCollection,
  remsCaseCollection,
  Requirement
} from '../fhir/models';
import { Communication, Task, Patient, MedicationRequest } from 'fhir/r4';
import axios from 'axios';
import config from '../config';
import { uid } from 'uid';
import container from '../lib/winston';
import { createQuestionnaireCompletionTask } from '../hooks/hookResources';

const router = Router();
const logger = container.get('application');

router.post('/authorize', async (req: Request, res: Response) => {
  try {
    const { caseNumber } = req.body;

    if (!caseNumber) {
      return res.status(400).json({ error: 'caseNumber is required' });
    }

    logger.info(`Dispense authorization check for case: ${caseNumber}`);

    // Find the REMS case
    const remsCase = await remsCaseCollection.findOne({ case_number: caseNumber });

    if (!remsCase) {
      logger.warn(`REMS case not found: ${caseNumber}`);
      return res.status(404).json({ 
        approved: false,
        error: 'Case not found' 
      });
    }

    // Get the medication to check requirements
    const medication = await medicationCollection.findOne({
      code: remsCase.drugCode,
      name: remsCase.drugName
    });

    if (!medication) {
      logger.error(`Medication not found: ${remsCase.drugCode}`);
      return res.status(500).json({ 
        approved: false,
        error: 'Medication not found' 
      });
    }

    // Check which requirements are required for dispensing and not completed
    const outstandingRequirements: Requirement[] = [];

    for (const requirement of medication.requirements) {
      if (requirement.requiredToDispense) {
        const metRequirement = remsCase.metRequirements.find(
          metReq => metReq.requirementName === requirement.name
        );

        if (!metRequirement || !metRequirement.completed) {
          outstandingRequirements.push(requirement);
        }
      }
    }

    // If all required requirements are met, approve
    if (outstandingRequirements.length === 0) {
      logger.info(`All requirements met for case ${caseNumber}. Approving.`);
      
      // Update dispense status
      remsCase.dispenseStatus = 'Approved';
      await remsCase.save();

      return res.status(200).json({ approved: true });
    }

    // Outstanding requirements - deny and send Communication
    logger.info(
      `Outstanding requirements for case ${caseNumber}: ${outstandingRequirements
        .map(r => r.name)
        .join(', ')}`
    );

    // Create patient object from REMS case
    const patient: Patient = {
      resourceType: 'Patient',
      id: `${remsCase.patientFirstName}-${remsCase.patientLastName}`.replace(/\s+/g, '-'),
      name: [
        {
          given: [remsCase.patientFirstName],
          family: remsCase.patientLastName
        }
      ],
      birthDate: remsCase.patientDOB
    };

    // Get the stored MedicationRequest reference or create a minimal one for Task context
    const medicationRequestRef = remsCase.medicationRequestReference || 
      `MedicationRequest/${remsCase.case_number}`;

    // Create a minimal MedicationRequest for task context if needed
    const medicationRequest: MedicationRequest = {
      resourceType: 'MedicationRequest',
      status: 'active',
      intent: 'order',
      medicationCodeableConcept: {
        coding: [
          {
            system: 'http://www.nlm.nih.gov/research/umls/rxnorm',
            code: remsCase.drugCode,
            display: remsCase.drugName
          }
        ]
      },
      subject: {
        reference: `Patient/${patient.id}`
      },
      requester: {
        reference: remsCase.metRequirements.find(mr =>
          mr.requirementName?.toLowerCase().includes('prescriber')
        )?.stakeholderId
      }
    };

    // Create Tasks using the existing function
    const tasks: Task[] = [];
    for (const requirement of outstandingRequirements) {
      if (requirement.appContext) {
        const questionnaireUrl = requirement.appContext;
        const task = createQuestionnaireCompletionTask(
          requirement,
          patient,
          questionnaireUrl,
          medicationRequest
        );
        task.id = `task-${uid()}`;
        tasks.push(task);
      }
    }

    // Create Communication resource
    const communication: Communication = {
      resourceType: 'Communication',
      id: `comm-${uid()}`,
      status: 'completed',
      category: [
        {
          coding: [
            {
              system: 'http://terminology.hl7.org/CodeSystem/communication-category',
              code: 'notification',
              display: 'Notification'
            }
          ]
        }
      ],
      priority: 'urgent',
      subject: {
        reference: `Patient/${patient.id}`,
        display: `${remsCase.patientFirstName} ${remsCase.patientLastName}`
      },
      topic: {
        coding: [
          {
            system: 'http://terminology.hl7.org/CodeSystem/communication-topic',
            code: 'progress-update',
            display: 'Progress Update'
          }
        ],
        text: 'Outstanding REMS Requirements for Medication Dispensing'
      },
      sent: new Date().toISOString(),
      recipient: [
        {
          reference: medicationRequest.requester?.reference || ''
        }
      ],
      sender: {
        reference: 'Organization/rems-admin',
        display: config.server?.name || 'REMS Administrator'
      },
      payload: [
        {
          contentString: `Medication dispensing authorization DENIED for ${remsCase.drugName}.\n\n` +
            `The following REMS requirements must be completed:\n\n` +
            outstandingRequirements
              .map((req, idx) => `${idx + 1}. ${req.name} (${req.stakeholderType})`)
              .join('\n') +
            `\n\nCase Number: ${remsCase.case_number}\n` +
            `Patient: ${remsCase.patientFirstName} ${remsCase.patientLastName} (DOB: ${remsCase.patientDOB})`
        }
      ],
      contained: tasks,
      about: [
        // Reference the actual MedicationRequest
        {
          reference: medicationRequestRef,
          display: `Prescription for ${remsCase.drugName}`
        },
        // Reference the contained Tasks
        ...tasks.map(task => ({
          reference: `#${task.id}`,
          display: task.description
        }))
      ]
    };

   
    let ehrEndpoint = config.fhirServerConfig?.auth?.resourceServer;

    // Send Communication to EHR
    if (ehrEndpoint) {
      try {
        const response = await axios.post(`${ehrEndpoint}/Communication`, communication, {
          headers: {
            'Content-Type': 'application/fhir+json'
          }
        });

        if (response.status === 200 || response.status === 201) {
          logger.info(`Communication sent to EHR: ${ehrEndpoint}`);
        }
      } catch (error: any) {
        logger.error(`Failed to send Communication to EHR: ${error.message}`);
      }
    } else {
      logger.warn('No EHR endpoint configured, Communication not sent');
    }

    return res.status(200).json({ approved: false });
  } catch (error: any) {
    logger.error(`Error in dispense authorization: ${error.message}`);
    return res.status(500).json({ 
      approved: false,
      error: 'Internal server error' 
    });
  }
});

export default router;