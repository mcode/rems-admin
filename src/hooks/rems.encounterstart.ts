import {
  EncounterStartHook,
  SupportedHooks,
  TypedResponseBody
} from '../rems-cds-hooks/resources/HookTypes';
import { ServicePrefetch, CdsService } from '../rems-cds-hooks/resources/CdsService';
import { handleCardEncounter, handleHook } from './hookResources';

interface TypedRequestBody extends Express.Request {
  body: EncounterStartHook;
}

const hookPrefetch: ServicePrefetch = {
  patient: 'Patient/{{context.patientId}}',
  practitioner: '{{context.userId}}',
  medicationRequests:
    'MedicationRequest?subject={{context.patientId}}&_include=MedicationRequest:medication'
};
const definition: CdsService = {
  id: 'rems-encounter-start',
  hook: SupportedHooks.ENCOUNTER_START,
  title: 'REMS Requirement Lookup',
  description: 'REMS Requirement Lookup',
  prefetch: hookPrefetch
};

const handler = (req: TypedRequestBody, res: TypedResponseBody) => {
  console.log('REMS encounter-start hook');
  const contextRequest = undefined;
  handleHook(req, res, hookPrefetch, contextRequest, handleCardEncounter);
};

export default { definition, handler };
