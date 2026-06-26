import { FhirUtilities } from '../fhir/utilities';
import { GuidanceResponseUtilities } from '../fhir/guidanceResponseUtilities';
import GuidanceResponseModel from '../lib/schemas/resources/GuidanceResponse';
import { Coding, Parameters, Medication, Patient, MedicationRequest } from 'fhir/r4';
import { getCaseInfo } from '../lib/etasu';
import { RemsCase } from '../fhir/models';

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
): Coding | undefined => {
  const selectRoutingCode = (codings: Coding[] | undefined) => {
    const ndc = codings?.find(medCode => medCode?.system?.toLowerCase().endsWith('/ndc'));
    if (ndc?.code) return ndc;

    return codings?.find(medCode => medCode?.system?.toLowerCase().includes('rxnorm'));
  };

  if (medication?.resourceType == 'Medication') {
    return selectRoutingCode(medication?.code?.coding);
  } else {
    if (medication?.medicationCodeableConcept) {
      return selectRoutingCode(medication?.medicationCodeableConcept?.coding);
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
};

module.exports.remsEtasu = async (args: any, context: any, logger: any) => {
  logger.info('Running GuidanceResponse rems-etasu check /$rems-etasu');

  const parameters: Parameters = args?.resource;
  let patient: Patient | undefined;
  let medication: Medication | MedicationRequest | undefined;
  let caseNumber: string | undefined;

  parameters?.parameter?.forEach(param => {
    if (param?.name === 'patient' && param?.resource?.resourceType === 'Patient') {
      patient = param.resource;
    } else if (
      param?.name === 'medication' &&
      (param?.resource?.resourceType === 'Medication' ||
        param.resource?.resourceType === 'MedicationRequest')
    ) {
      medication = param.resource;
    } else if (param?.name === 'caseNumber') {
      caseNumber = param.valueString;
    }
  });

  let etasu: Pick<
    RemsCase,
    | 'drugName'
    | 'case_number'
    | 'status'
    | 'drugCode'
    | 'patientFirstName'
    | 'patientLastName'
    | 'patientDOB'
    | 'metRequirements'
  > | null;

  if (caseNumber) {
    const remsCaseSearchDict = {
      case_number: caseNumber
    };

    const medicationSearchDict = {};

    etasu = await getCaseInfo(remsCaseSearchDict, medicationSearchDict);
  } else {
    const drugCode = getMedicationCode(medication);
    const drugCodeIsNdc = drugCode?.system?.toLowerCase().endsWith('/ndc');

    // grab the patient demographics from the Patient resource in the parameters
    const remsCaseSearchDict = {
      patientFirstName: patient?.name?.[0]?.given?.[0],
      patientLastName: patient?.name?.[0]?.family,
      patientDOB: patient?.birthDate,
      ...(drugCodeIsNdc ? { drugNdcCode: drugCode?.code } : { drugCode: drugCode?.code })
    };

    const medicationSearchDict = drugCodeIsNdc
      ? { ndcCode: drugCode?.code }
      : { code: drugCode?.code };

    etasu = await getCaseInfo(remsCaseSearchDict, medicationSearchDict);
  }

  return GuidanceResponseUtilities.createEtasuGuidanceResponse(etasu, patient);
};
