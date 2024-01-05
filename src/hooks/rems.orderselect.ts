import {
  SupportedHooks,
  OrderSelectHook
} from '../rems-cds-hooks/resources/HookTypes';
import { ServicePrefetch, CdsService } from '../rems-cds-hooks/resources/CdsService';
import {
  handleCardOrder,
  handleHook
} from './hookResources';

interface TypedRequestBody extends Express.Request {
  body: OrderSelectHook;
}

const hookPrefetch: ServicePrefetch = {
  patient: 'Patient/{{context.patientId}}',
  practitioner: '{{context.userId}}'
};
const definition: CdsService = {
  id: 'rems-order-select',
  hook: SupportedHooks.ORDER_SELECT,
  title: 'REMS Requirement Lookup',
  description: 'REMS Requirement Lookup',
  prefetch: hookPrefetch
};

const handler = (req: TypedRequestBody, res: any) => {
  console.log('REMS order-select hook');
  const context = req.body.context;
  const selection = context.selections?.[0];
  const contextRequest = context.draftOrders?.entry?.filter(entry => {
    if (entry.resource) {
      return selection === `${entry.resource.resourceType}/${entry.resource.id}`;
    }
  })[0].resource;
  handleHook(req, res, hookPrefetch, contextRequest, handleCardOrder);

};

export default { definition, handler };
