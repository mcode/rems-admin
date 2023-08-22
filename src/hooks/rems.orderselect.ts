import Card from '../cards/Card';
import {
  SupportedHooks,
  OrderSelectPrefetch,
  OrderSelectHook
} from '../rems-cds-hooks/resources/HookTypes';
import { ServicePrefetch, CdsService } from '../rems-cds-hooks/resources/CdsService';
import { Coding } from 'fhir/r4';
import { Link } from '../cards/Card';
import config from '../config';
import { hydrate } from '../rems-cds-hooks/prefetch/PrefetchHydrator';
import axios from 'axios';
import { validCodes, codeMap, CARD_DETAILS, getFhirResource } from './hookResources';


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
const source = {
  label: 'MCODE REMS Administrator Prototype',
  url: new URL('https://github.com/mcode/REMS')
};
function buildErrorCard(reason: string) {
  const errorCard = new Card('Bad Request', reason, source, 'warning');
  const cards = {
    cards: [errorCard.card]
  };
  return cards;
}

const handler = (req: TypedRequestBody, res: any) => {

  function handleCard(hydratedPrefetch: OrderSelectPrefetch) {
    console.log(hydratedPrefetch);
    const context = req.body.context;
    // const contextRequest = context.draftOrders?.entry?.[0].resource;
    const selection = context.selections?.[0];
    const contextRequest = context.draftOrders?.entry?.filter((entry) => {
        if(entry.resource) {
            return selection === `${entry.resource.resourceType}/${entry.resource.id}`
        }
    })[0].resource;
    const patient = hydratedPrefetch?.patient;
    const prefetchRequest = hydratedPrefetch?.request;
    const practitioner = hydratedPrefetch?.practitioner;
    const npi = practitioner?.identifier;
    console.log('    Practitioner: ' + practitioner?.id + ' NPI: ' + npi);
    console.log('    Patient: ' + patient?.id);

    console.log('    MedicationRequest: ' + prefetchRequest?.id);
    console.log('    Practitioner: ' + practitioner?.id + ' NPI: ' + npi);
    console.log('    Patient: ' + patient?.id);

    // verify a MedicationRequest was sent
    if (contextRequest && contextRequest.resourceType !== 'MedicationRequest') {
      res.json(buildErrorCard('DraftOrders does not contain a MedicationRequest'));
      return;
    }

    // verify ids
    if (
      patient?.id &&
      patient.id.replace('Patient/', '') !== context.patientId.replace('Patient/', '')
    ) {
      res.json(buildErrorCard('Context patientId does not match prefetch Patient ID'));
      return;
    }
    if (
      practitioner?.id &&
      practitioner.id.replace('Practitioner/', '') !== context.userId.replace('Practitioner/', '')
    ) {
      res.json(buildErrorCard('Context userId does not match prefetch Practitioner ID'));
      return;
    }
    if (
      prefetchRequest?.id &&
      contextRequest &&
      contextRequest.id &&
      prefetchRequest.id.replace('MedicationRequest/', '') !==
        contextRequest.id.replace('MedicationRequest/', '')
    ) {
      res.json(buildErrorCard('Context draftOrder does not match prefetch MedicationRequest ID'));
      return;
    }

    const medicationCode = contextRequest?.medicationCodeableConcept?.coding?.[0];
    if (medicationCode && medicationCode.code) {
      const returnCard = validCodes.some(e => {
        return e.code === medicationCode.code && e.system === medicationCode.system;
      });
      if (returnCard) {
        const cardArray: Card[] = [];
        const codeRule = codeMap[medicationCode.code];
        for (const rule of codeRule) {
          const card = new Card(
            rule.summary || medicationCode.display || 'Rems',
            CARD_DETAILS,
            source,
            'info'
          );
          rule.links.forEach(function (e) {
            if (e.type == 'absolute') {
              // no construction needed
              card.addLink(e);
            } else {
              // link is SMART
              // TODO: smart links should be built with discovered questionnaires, not hard coded ones
              const newLink: Link = {
                label: e.label,
                url: e.url,
                type: e.type,
                appContext: `${e.appContext}&order=${JSON.stringify(contextRequest)}&coverage=${
                  contextRequest.insurance?.[0].reference
                }`
              };
              card.addLink(newLink);
            }
          });
          cardArray.push(card);
        }
        res.json({
          cards: cardArray
        });
      } else {
        res.json(buildErrorCard('Unsupported code'));
      }
    } else {
      res.json(buildErrorCard('MedicationRequest does not contain a code'));
    }
  }
  console.log('REMS order-select hook');
  try {
    const fhirUrl = req.body.fhirServer;
    if (fhirUrl) {
      hydrate(getFhirResource, hookPrefetch, req.body).then(
        (hydratedPrefetch: OrderSelectPrefetch) => {
          handleCard(hydratedPrefetch);
        }
      );
    } else {
      if (req.body.prefetch) {
        handleCard(req.body.prefetch);
      } else {
        handleCard({});
      }
    }
  } catch (error) {
    console.log(error);
    res.json(buildErrorCard('Unknown Error'));
  }
};

export default { definition, handler };
