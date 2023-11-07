import Card from '../cards/Card';
import {
  OrderSignHook,
  SupportedHooks,
  OrderSignPrefetch
} from '../rems-cds-hooks/resources/HookTypes';
import { medicationCollection, remsCaseCollection } from '../fhir/models';
import { ServicePrefetch, CdsService } from '../rems-cds-hooks/resources/CdsService';
import { MedicationRequest } from 'fhir/r4';
import { Link } from '../cards/Card';
import config from '../config';
import { hydrate } from '../rems-cds-hooks/prefetch/PrefetchHydrator';
import { validCodes, codeMap, CARD_DETAILS } from './hookResources';
import axios from 'axios';

interface TypedRequestBody extends Express.Request {
  body: OrderSignHook;
}

const hookPrefetch: ServicePrefetch = {
  patient: 'Patient/{{context.patientId}}',
  practitioner: '{{context.userId}}'
};
const definition: CdsService = {
  id: 'rems-order-sign',
  hook: SupportedHooks.ORDER_SIGN,
  title: 'REMS Requirement Lookup',
  description: 'REMS Requirement Lookup',
  prefetch: hookPrefetch
};
const source = {
  label: 'MCODE REMS Administrator Prototype',
  url: new URL('https://github.com/mcode/rems-admin')
};
function buildErrorCard(reason: string) {
  const errorCard = new Card('Bad Request', reason, source, 'warning');
  const cards = {
    cards: [errorCard.card]
  };
  return cards;
}

const handler = (req: TypedRequestBody, res: any) => {
  async function getFhirResource(token: string) {
    const ehrUrl = `${req.body.fhirServer}/${token}`;
    const access_token = req.body.fhirAuthorization?.access_token;
    const options = {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${access_token}`
      }
    };
    // application errors out here if you can't reach out to the EHR and results in server stopping and subsequent requests failing 
    let response = {data: {}};
    try {
      response = await axios(ehrUrl, options);
    } catch (error: any)  {
      console.warn("Could not connect to EHR Server: " + error);
      response = error;
    }
    return response?.data;
  }

  function createSmartLink(
    requirementName: string,
    appContext: string,
    request: MedicationRequest
  ) {
    const newLink: Link = {
      label: requirementName + ' Form',
      url: new URL(config.smart.endpoint),
      type: 'smart',
      appContext: `${appContext}&order=${JSON.stringify(request)}&coverage=${
        request.insurance?.[0].reference
      }`
    };
    return newLink;
  }

  async function handleCard(hydratedPrefetch: OrderSignPrefetch) {
    console.log(hydratedPrefetch);
    const context = req.body.context;
    const contextRequest = context.draftOrders?.entry?.[0].resource;
    const patient = hydratedPrefetch?.patient;
    const prefetchRequest = hydratedPrefetch?.request;
    const practitioner = hydratedPrefetch?.practitioner;
    const npi = practitioner?.identifier;

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
      // find the drug in the medicationCollection to get the smart links
      const drug = await medicationCollection
        .findOne({
          code: medicationCode.code,
          codeSystem: medicationCode.system
        })
        .exec();

      // find a matching rems case for the patient and this drug to only return needed results
      const patientName = patient?.name?.[0];
      const etasu = await remsCaseCollection.findOne({
        patientFirstName: patientName?.given?.[0],
        patientLastName: patientName?.family,
        patientDOB: patient?.birthDate,
        drugCode: medicationCode?.code
      });

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
            }
          });

          let smartLinkCount = 0;

          // process the smart links from the medicationCollection
          // TODO: smart links should be built with discovered questionnaires, not hard coded ones
          if (drug) {
            for (const requirement of drug.requirements) {
              if (requirement.stakeholderType == rule.stakeholderType) {
                // only add the link if the form has not already been processed / received
                if (etasu) {
                  let found = false;
                  for (const metRequirement of etasu.metRequirements) {
                    if (metRequirement.requirementName == requirement.name) {
                      found = true;
                      if (!metRequirement.completed) {
                        card.addLink(
                          createSmartLink(requirement.name, requirement.appContext, contextRequest)
                        );
                        smartLinkCount++;
                      }
                    }
                  }
                  if (!found) {
                    card.addLink(
                      createSmartLink(requirement.name, requirement.appContext, contextRequest)
                    );
                    smartLinkCount++;
                  }
                } else {
                  // if (etasu)
                  // add all the links if no etasu to check
                  card.addLink(
                    createSmartLink(requirement.name, requirement.appContext, contextRequest)
                  );
                  smartLinkCount++;
                }
              }
            }
          }

          // only add the card if there are smart links to needed forms
          if (smartLinkCount > 0) {
            cardArray.push(card);
          }
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

  console.log('REMS order-sign hook');
  try {
    const fhirUrl = req.body.fhirServer;
    if (fhirUrl) {
      hydrate(getFhirResource, hookPrefetch, req.body).then(
        (hydratedPrefetch: OrderSignPrefetch) => {
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
