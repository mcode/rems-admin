import { FhirUtilities } from '../fhir/utilities';
import { GuidanceResponseUtilities } from '../fhir/guidanceResponseUtilities';
import GuidanceResponseModel from '../lib/schemas/resources/GuidanceResponse';
import { Parameters, Medication, Patient, MedicationRequest } from 'fhir/r4';
import { getCaseInfo } from '../lib/etasu';

module.exports.searchById = async (args: any) => {
  const { id } = args;
  console.log('GuidanceResponse >>> searchById: -- ' + id);
  return await GuidanceResponseModel.findOne({ id: id.toString() }, { _id: 0 }).exec();
};

module.exports.create = async (args: any, req: any) => {
  console.log('GuidanceResponse >>> create');
  const resource = req.req.body;
  const { base_version } = args;
  return await FhirUtilities.store(resource, GuidanceResponseModel, base_version);
};

const getMedicationCode = (
  medication: Medication | MedicationRequest | undefined
): string | undefined => {
  // grab the medication drug code from the Medication resource
  let drugCode;
  if (medication?.resourceType == 'Medication') {
    medication?.code?.coding?.forEach(medCode => {
      if (medCode?.system?.endsWith('rxnorm')) {
        drugCode = medCode?.code;
      }
    });
  } else {
    if (medication?.medicationCodeableConcept) {
      medication?.medicationCodeableConcept?.coding?.forEach(medCode => {
        if (medCode.system?.endsWith('rxnorm')) {
          drugCode = medCode.code;
        }
      });
    } else if (medication?.medicationReference) {
      const ref = medication.medicationReference.reference;
      if (ref?.startsWith('#')) {
        const containedRef = ref.slice(1);
        const match = medication.contained?.find(res => {
          return res.id === containedRef;
        });
        if (match?.resourceType === 'Medication') {
          return getMedicationCode(match);
        }
      }
    }
  }
  return drugCode;
};

module.exports.remsEtasu = async (args: any, context: any, logger: any) => {
  logger.info('Running GuidanceResponse rems-etasu check /$rems-etasu');

  const parameters: Parameters = args?.resource;
  let patient: Patient | undefined;
  let medication: Medication | MedicationRequest | undefined;

  parameters?.parameter?.forEach(param => {
    if (param?.name === 'patient' && param?.resource?.resourceType === 'Patient') {
      patient = param.resource;
    } else if (
      param?.name === 'medication' &&
      (param?.resource?.resourceType === 'Medication' ||
        param.resource?.resourceType === 'MedicationRequest')
    ) {
      medication = param.resource;
    }
  });

  const drugCode = getMedicationCode(medication);

  // grab the patient demographics from the Patient resource in the parameters
  const remsCaseSearchDict = {
    patientFirstName: patient?.name?.[0]?.given,
    patientLastName: patient?.name?.[0]?.family,
    patientDOB: patient?.birthDate,
    drugCode: drugCode
  };

  const medicationSearchDict = {
    code: drugCode
  };

  const etasu = await getCaseInfo(remsCaseSearchDict, medicationSearchDict);

  return GuidanceResponseUtilities.createEtasuGuidanceResponse(etasu, patient);
};
