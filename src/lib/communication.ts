import { Communication, Task, Patient, MedicationRequest } from 'fhir/r4';
import axios from 'axios';
import config from '../config';
import { uid } from 'uid';
import container from './winston';
import { createQuestionnaireCompletionTask } from '../hooks/hookResources';
import { Requirement } from '../fhir/models';

const logger = container.get('application');

export async function sendCommunicationToEHR(
  remsCase: any,
  medication: any,
  outstandingRequirements: any[]
): Promise<void> {
  try {
    logger.info(`Creating Communication for case ${remsCase.case_number}`);

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

    // Get the stored MedicationRequest reference
    const medicationRequestRef = remsCase.medicationRequestReference;

    // Create a minimal MedicationRequest for task context
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
        reference: remsCase.metRequirements.find((mr: any) =>
          mr.requirementName?.toLowerCase().includes('prescriber')
        )?.stakeholderId
      }
    };

    // Create Tasks for each outstanding requirement
    const tasks: Task[] = [];
    for (const outstandingReq of outstandingRequirements) {
      const requirement =
        outstandingReq.requirement ||
        medication.requirements.find((r: Requirement) => r.name === outstandingReq.name);

      if (requirement && requirement.appContext) {
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
          contentString:
            `Medication dispensing authorization DENIED for ${remsCase.drugName}.\n\n` +
            'The following REMS requirements must be completed:\n\n' +
            outstandingRequirements
              .map((req, idx) => `${idx + 1}. ${req.name} (${req.stakeholder})`)
              .join('\n') +
            `\n\nCase Number: ${remsCase.case_number}\n` +
            `Patient: ${remsCase.patientFirstName} ${remsCase.patientLastName} (DOB: ${remsCase.patientDOB})`
        }
      ],
      contained: tasks,
      about: [
        {
          reference: medicationRequestRef,
          display: `Prescription for ${remsCase.drugName}`
        },
        ...tasks.map(task => ({
          reference: `#${task.id}`,
          display: task.description
        }))
      ]
    };

    // Determine EHR endpoint: use originatingFhirServer if available, otherwise default
    let ehrEndpoint =
      remsCase.originatingFhirServer || config.fhirServerConfig?.auth?.resourceServer;

    if (!ehrEndpoint) {
      logger.warn('No EHR endpoint configured, Communication not sent');
      return;
    }

    if (config.fhirServerConfig.auth.dockered_ehr_container_name) {
      const originalEhrEndpoint = ehrEndpoint;
      ehrEndpoint = originalEhrEndpoint
        .replace(/localhost/g, config.fhirServerConfig.auth.dockered_ehr_container_name)
        .replace(/127\.0\.0\.1/g, config.fhirServerConfig.auth.dockered_ehr_container_name);
      logger.info(
        `Running locally in Docker, converting EHR url from ${originalEhrEndpoint} to ${ehrEndpoint}`
      );
    }

    // Send Communication to EHR
    logger.info(`Sending Communication to EHR: ${ehrEndpoint}`);

    const response = await axios.post(`${ehrEndpoint}/Communication`, communication, {
      headers: {
        'Content-Type': 'application/fhir+json'
      }
    });

    if (response.status === 200 || response.status === 201) {
      logger.info(`Communication successfully sent to EHR for case ${remsCase.case_number}`);
    } else {
      logger.warn(`Unexpected response status from EHR: ${response.status}`);
    }
  } catch (error: any) {
    logger.error(`Failed to send Communication to EHR: ${error.message}`);
    throw error;
  }
}
