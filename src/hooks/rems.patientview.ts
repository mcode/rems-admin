import Card from '../cards/Card';
import {
  PatientViewHook,
  SupportedHooks,
  PatientViewPrefetch
} from '../rems-cds-hooks/resources/HookTypes';
import { medicationCollection, remsCaseCollection } from '../fhir/models';
import { ServicePrefetch, CdsService } from '../rems-cds-hooks/resources/CdsService';
import { MedicationRequest } from 'fhir/r4';
import { Link } from '../cards/Card';
import config from '../config';
import { hydrate } from '../rems-cds-hooks/prefetch/PrefetchHydrator';
import { codeMap, CARD_DETAILS, getDrugCodeFromMedicationRequest } from './hookResources';
import axios from 'axios';

interface TypedRequestBody extends Express.Request {
  body: PatientViewHook;
}

const hookPrefetch: ServicePrefetch = {
  patient: 'Patient/{{context.patientId}}',
  practitioner: '{{context.userId}}',
  medicationRequests: 'MedicationRequest?subject={{context.patientId}}'
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
function buildErrorCard(reason: string) {
  const errorCard = new Card('Bad Request', reason, source, 'warning');
  const cards = {
    cards: [errorCard.card]
  };
  return cards;
}

const handler = (req: TypedRequestBody, res: any) => {
  function getFhirResource(token: string) {
    const ehrUrl = `${req.body.fhirServer}/${token}`;
    const access_token = req.body.fhirAuthorization?.access_token;
    const options = {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${access_token}`
      }
    };
    const response = axios(ehrUrl, options);
    return response.then(e => {
      return e.data;
    });
  }

  function createSmartLink(
    requirementName: string,
    appContext: string,
    request: MedicationRequest | undefined
  ) {
    const newLink: Link = {
      label: requirementName + ' Form',
      url: new URL(config.smart.endpoint),
      type: 'smart',
      appContext: `${appContext}&order=${JSON.stringify(request)}&coverage=${
        request?.insurance?.[0].reference
      }`
    };
    return newLink;
  }

  async function handleCard(hydratedPrefetch: PatientViewPrefetch) {
    console.log(hydratedPrefetch);
    const context = req.body.context;
    const patient = hydratedPrefetch?.patient;
    const practitioner = hydratedPrefetch?.practitioner;
    const medicationRequestsBundle = hydratedPrefetch?.medicationRequests;
    const npi = practitioner?.identifier;

    console.log('    Practitioner: ' + practitioner?.id + ' NPI: ' + npi);
    console.log('    Patient: ' + patient?.id);

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

    //TODO: should we add the other pdf information links to the card, or just have the smart links?

    // create empty card array
    const cardArray: Card[] = [];

    // find all matching rems cases for the patient
    const patientName = patient?.name?.[0];
    const remsCaseList = await remsCaseCollection.find({
      patientFirstName: patientName?.given?.[0],
      patientLastName: patientName?.family,
      patientDOB: patient?.birthDate
    });

    // loop through all the rems cases in the list
    for (const remsCase of remsCaseList) {
      // find the drug in the medicationCollection that matches the REMS case to get the smart links
      const drug = await medicationCollection
        .findOne({
          code: remsCase.drugCode,
          name: remsCase.drugName
        })
        .exec();

      // get the rule summary from the codemap
      const codeRule = codeMap[remsCase.drugCode];
      let summary = '';
      for (const rule of codeRule) {
        if (rule.stakeholderType === 'patient') {
          summary = rule.summary || remsCase.drugName || 'Rems';
        }
      }

      // create the card
      let smartLinkCount = 0;
      const card = new Card(summary, CARD_DETAILS, source, 'info');

      // find the matching MedicationRequest for the context
      const request = medicationRequestsBundle?.entry?.filter(entry => {
        if (entry.resource) {
          if (entry.resource.resourceType === 'MedicationRequest') {
            const medReq: MedicationRequest = entry.resource;
            const medicationCode = getDrugCodeFromMedicationRequest(medReq);
            return remsCase.drugCode === medicationCode?.code;
          }
        }
      })[0].resource;

      // if no valid request or not a MedicationRequest found skip this REMS case
      if (!request || (request && request.resourceType !== 'MedicationRequest')) {
        continue;
      }

      // loop through all of the ETASU requirements for this drug
      const requirements = drug?.requirements;
      for (const requirement of requirements) {
        // find all of the matching patient forms
        if (requirement?.stakeholderType === 'patient') {
          let found = false;
          // match the requirement to the metRequirement of the REMS case
          for (const metRequirement of remsCase.metRequirements) {
            // only add the link if the form is still needed to be completed
            if (metRequirement.requirementName === requirement.name) {
              found = true;
              if (!metRequirement.completed) {
                card.addLink(createSmartLink(requirement.name, requirement.appContext, request));
                smartLinkCount++;
              }
            }
          }

          // if not in the list of metReuirements, add it as well
          if (!found) {
            card.addLink(createSmartLink(requirement.name, requirement.appContext, request));
            smartLinkCount++;
          }
        }
      }

      // only add the card to the list if there is a link
      if (smartLinkCount > 0) {
        cardArray.push(card);
      }
    }

    res.json({
      cards: cardArray
    });
  }

  console.log('REMS patient-view hook');
  try {
    const fhirUrl = req.body.fhirServer;
    const fhirAuth = req.body.fhirAuthorization;
    if (fhirUrl && fhirAuth && fhirAuth.access_token) {
      hydrate(getFhirResource, hookPrefetch, req.body).then(
        (hydratedPrefetch: PatientViewPrefetch) => {
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
