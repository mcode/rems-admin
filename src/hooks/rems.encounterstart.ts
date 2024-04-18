import { SupportedHooks, EncounterStartHook } from '../rems-cds-hooks/resources/HookTypes';
import { ServicePrefetch, CdsService } from '../rems-cds-hooks/resources/CdsService';
import { handleCardOrder, handleHook } from './hookResources';

interface TypedRequestBody extends Express.Request {
  body: EncounterStartHook;
}

const hookPrefetch: ServicePrefetch = {
  patient: 'Patient/{{context.patientId}}',
  practitioner: '{{context.userId}}'
};
const definition: CdsService = {
  id: 'rems-encounter-start',
  hook: SupportedHooks.ENCOUNTER_START,
  title: 'REMS Encounter Start',
  description: 'REMS Encounter Start',
  prefetch: hookPrefetch
};

const handler = (req: TypedRequestBody, res: any) => {
  console.log('REMS encounter-start hook');
  const context = req.body.context;
  // const selection = context.selections?.[0];
  //   const contextRequest = context.draftOrders?.entry?.filter(entry => {
  //     if (entry.resource) {
  //       return selection === `${entry.resource.resourceType}/${entry.resource.id}`;
  //     }
  //   })[0].resource;
  handleHook(req, res, hookPrefetch, context, handleCardOrder);
};

export default { definition, handler };
