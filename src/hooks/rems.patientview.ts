import { PatientViewHook, SupportedHooks } from '../rems-cds-hooks/resources/HookTypes';
import { ServicePrefetch, CdsService } from '../rems-cds-hooks/resources/CdsService';
import { handleCardEncounter, handleHook } from './hookResources';

interface TypedRequestBody extends Express.Request {
  body: PatientViewHook;
}

const hookPrefetch: ServicePrefetch = {
  patient: 'Patient/{{context.patientId}}',
  practitioner: '{{context.userId}}',
  medicationRequests:
    'MedicationRequest?subject={{context.patientId}}&_include=MedicationRequest:medication'
};
const definition: CdsService = {
  id: 'rems-patient-view',
  hook: SupportedHooks.PATIENT_VIEW,
  title: 'REMS Requirement Lookup',
  description: 'REMS Requirement Lookup',
  prefetch: hookPrefetch
};
const source = {
  label: 'MCODE REMS Administrator Prototype',
  url: new URL('https://github.com/mcode/rems-admin')
};

const handler = (req: TypedRequestBody, res: any) => {
  console.log('REMS patient-view hook');
  const contextRequest = undefined;
  handleHook(req, res, hookPrefetch, contextRequest, handleCardEncounter);
};

export default { definition, handler };
