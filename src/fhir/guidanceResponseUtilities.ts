import { Parameters, Patient, GuidanceResponse } from 'fhir/r4';
import container from '../lib/winston';
import { RemsCase } from './models';

const MODULE_URI = 'https://build.fhir.org/ig/HL7/fhir-medication-rems-ig/';

export class GuidanceResponseUtilities {
  static logger = container.get('application');

  static translateStatus(etasuStatus: string | undefined) {
    // translate the status
    let remsStatus:
      | 'success'
      | 'data-requested'
      | 'data-required'
      | 'in-progress'
      | 'failure'
      | 'entered-in-error' = 'failure';
    if (etasuStatus === 'Pending') {
      remsStatus = 'data-required';
    } else if (etasuStatus === 'Approved') {
      remsStatus = 'success';
    }
    return remsStatus;
  }

  static processEtasuRequirements(
    etasu: Pick<
      RemsCase,
      | 'drugName'
      | 'auth_number'
      | 'case_number'
      | 'status'
      | 'drugCode'
      | 'patientFirstName'
      | 'patientLastName'
      | 'patientDOB'
      | 'metRequirements'
    > | null
  ) {
    // create the output parameters
    let addedRequirementCount = 0;
    const outputParameters: Parameters = {
      resourceType: 'Parameters',
      id: 'etasuOutputParameters'
    };

    // create the Parameters for the individual ETASU
    etasu?.metRequirements?.forEach(metRequirement => {
      // create a GuidanceResponse to embed with the individual requirement for the ETASU
      const etasuGuidanceResponse: GuidanceResponse = {
        resourceType: 'GuidanceResponse',
        status: metRequirement?.completed ? 'success' : 'data-required',
        moduleUri: MODULE_URI,
        subject: {
          reference: metRequirement?.stakeholderId
        },
        note: [
          {
            text: metRequirement?.requirementName ? metRequirement?.requirementName : 'unknown'
          }
        ]
      };

      addedRequirementCount++;

      const parameter = {
        //TODO: remove spaces from name?
        name: metRequirement?.requirementName
          ? metRequirement?.requirementName
          : 'requirement' + addedRequirementCount,
        resource: etasuGuidanceResponse
      };

      // add the ETASU requirement GuidanceResponse to the outputParameters
      if (!outputParameters?.parameter) {
        outputParameters.parameter = [parameter];
      } else {
        outputParameters.parameter?.push(parameter);
      }
    });
    outputParameters.parameter?.push({ name: 'auth_number', valueString: etasu?.auth_number });
    return outputParameters;
  }

  static createEtasuGuidanceResponse(
    etasu: Pick<
      RemsCase,
      | 'drugName'
      | 'auth_number'
      | 'case_number'
      | 'status'
      | 'drugCode'
      | 'patientFirstName'
      | 'patientLastName'
      | 'patientDOB'
      | 'metRequirements'
    > | null,
    patient: Patient | undefined
  ) {
    const remsStatus = this.translateStatus(etasu?.status);

    // create a GuidanceResponse representing the rems etasu status
    const guidanceResponse: GuidanceResponse = {
      resourceType: 'GuidanceResponse',
      status: remsStatus,
      moduleUri: MODULE_URI
    };

    // optionally add the patient as the subject if the ID is available
    if (patient?.id) {
      guidanceResponse.subject = {
        reference: 'Patient/' + patient?.id
      };
    }

    // process and add the etasu requirements as output parameters
    const outputParameters = this.processEtasuRequirements(etasu);

    if (outputParameters?.parameter) {
      // set the output parameters
      guidanceResponse.outputParameters = {
        reference: '#' + outputParameters.id
      };

      // add the contained parameters
      guidanceResponse.contained = [outputParameters];
    }

    // create the return Parameters containing the GuidanceResponse for the ETASU
    const returnParameters: Parameters = {
      resourceType: 'Parameters',
      parameter: [
        {
          name: 'rems-etasu',
          resource: guidanceResponse
        }
      ]
    };

    return returnParameters;
  }
}
