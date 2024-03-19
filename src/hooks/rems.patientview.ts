import Card from '../cards/Card';
import {
  PatientViewHook,
  SupportedHooks,
  HookPrefetch
} from '../rems-cds-hooks/resources/HookTypes';
import { medicationCollection, remsCaseCollection } from '../fhir/models';
import { ServicePrefetch, CdsService } from '../rems-cds-hooks/resources/CdsService';
import { Bundle, FhirResource, MedicationRequest } from 'fhir/r4';

import {
  codeMap,
  CARD_DETAILS,
  getDrugCodeFromMedicationRequest,
  createSmartLink,
  handleHook
} from './hookResources';

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
function buildErrorCard(reason: string) {
  const errorCard = new Card('Bad Request', reason, source, 'warning');
  const cards = {
    cards: [errorCard.card]
  };
  return cards;
}

const handler = (req: TypedRequestBody, res: any) => {
  console.log('REMS patient-view hook');
  // process the MedicationRequests to add the Medication into contained resources
  function processMedicationRequests(medicationRequestsBundle: Bundle) {
    medicationRequestsBundle?.entry?.forEach(entry => {
      if (entry?.resource?.resourceType === 'MedicationRequest') {
        if (entry?.resource?.medicationReference) {
          const medicationReference = entry?.resource?.medicationReference;
          medicationRequestsBundle?.entry?.forEach(e => {
            if (e?.resource?.resourceType === 'Medication') {
              if (
                e?.resource?.resourceType + '/' + e?.resource?.id ===
                medicationReference?.reference
              ) {
                if (entry) {
                  if (entry.resource) {
                    const reference = e?.resource;
                    const request = entry.resource as MedicationRequest;

                    // add the reference as a contained resource to the request
                    if (!request?.contained) {
                      request.contained = [];
                      request.contained.push(reference);
                    } else {
                      // only add to contained if not already in there
                      let found = false;
                      request.contained.forEach(c => {
                        if (c.id === reference.id) {
                          found = true;
                        }
                      });
                      if (!found) {
                        request.contained.push(reference);
                      }
                    }
                  }
                }
              }
            }
          });
        }
      }
    });
  }

  async function handleCard(
    res: any,
    hookPrefetch: HookPrefetch | undefined,
    contextRequest: FhirResource | undefined,
    patient: FhirResource | undefined
  ) {
    //TODO: should we add the other pdf information links to the card, or just have the smart links?

    const medResource = hookPrefetch?.medicationRequests;
    const medicationRequestsBundle =
      medResource?.resourceType === 'Bundle' ? medResource : undefined;

    // create empty card array
    const cardArray: Card[] = [];

    // find all matching rems cases for the patient
    const patientName = patient?.resourceType === 'Patient' ? patient?.name?.[0] : undefined;
    const patientBirth = patient?.resourceType === 'Patient' ? patient?.birthDate : undefined;
    const remsCaseList = await remsCaseCollection.find({
      patientFirstName: patientName?.given?.[0],
      patientLastName: patientName?.family,
      patientDOB: patientBirth
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

      // process the MedicationRequests to add the Medication into contained resources
      if (medicationRequestsBundle) {
        processMedicationRequests(medicationRequestsBundle);
      }

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
      const requirements = drug?.requirements || [];
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

  // contextRequest is undefined
  handleHook(req, res, hookPrefetch, undefined, handleCard);
};

export default { definition, handler };
