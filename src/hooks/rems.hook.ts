import Card from '../cards/Card';
import {
  OrderSignHook,
  SupportedHooks,
  OrderSignPrefetch
} from '../rems-cds-hooks/resources/HookTypes';
import {
  medicationCollection,
  remsCaseCollection
} from '../fhir/models';
import { ServicePrefetch, CdsService } from '../rems-cds-hooks/resources/CdsService';
import { Coding, MedicationRequest } from 'fhir/r4';
import { Link } from '../cards/Card';
import config from '../config';
import { hydrate } from '../rems-cds-hooks/prefetch/PrefetchHydrator';
import axios from 'axios';

interface CardRule {
  links: Link[];
  summary?: string;
  stakeholderType?: string;
}
const CARD_DETAILS = 'Documentation Required, please complete form via Smart App link.';
// TODO: this codemap should be replaced with a system similar to original CRD's questionnaire package operation
// the app doesn't necessarily have to use CQL for this.
const codeMap: { [key: string]: CardRule[] } = {
  '2183126': [
    {
      links: [
        {
          label: 'Documentation Requirements',
          type: 'absolute',
          url: new URL(
            'https://www.accessdata.fda.gov/drugsatfda_docs/rems/Turalio_2020_08_04_REMS_Full.pdf'
          )
        },
        {
          label: 'Medication Guide',
          type: 'absolute',
          url: new URL(
            'https://daiichisankyo.us/prescribing-information-portlet/getPIContent?productName=Turalio_Med&inline=true'
          )
        },
        {
          label: 'Patient Guide',
          type: 'absolute',
          url: new URL(
            'https://www.accessdata.fda.gov/drugsatfda_docs/rems/Turalio_2020_12_16_Patient_Guide.pdf'
          )
        }
      ],
      stakeholderType: 'patient',
      summary: 'Turalio REMS Patient Requirements'
    },
    {
      links: [
        {
          label: 'Documentation Requirements',
          type: 'absolute',
          url: new URL(
            'https://daiichisankyo.us/prescribing-information-portlet/getPIContent?productName=Turalio&inline=true'
          )
        },
        {
          label: 'Program Overview',
          type: 'absolute',
          url: new URL(
            'https://www.accessdata.fda.gov/drugsatfda_docs/rems/Turalio_2020_12_16_Program_Overview.pdf'
          )
        },
        {
          label: 'Prescriber Training',
          type: 'absolute',
          url: new URL(
            'https://www.accessdata.fda.gov/drugsatfda_docs/rems/Turalio_2020_12_16_Prescriber_Training.pdf'
          )
        }
      ],
      stakeholderType: 'prescriber',
      summary: 'Turalio REMS Prescriber Requirements'
    }
  ],
  '6064': [
    {
      links: [
        {
          label: 'Documentation Requirements',
          type: 'absolute',
          url: new URL(
            'https://www.accessdata.fda.gov/drugsatfda_docs/rems/Isotretinoin_2021_10_8_REMS_Document.pdf'
          )
        },
        {
          label: 'Fact Sheet',
          type: 'absolute',
          url: new URL(
            'https://www.accessdata.fda.gov/drugsatfda_docs/rems/Isotretinoin_2021_10_8_Fact_Sheet.pdf'
          )
        },
        {
          label: 'Guide For Patients Who Can Get Pregnant',
          type: 'absolute',
          url: new URL(
            'https://www.accessdata.fda.gov/drugsatfda_docs/rems/Isotretinoin_2021_10_8_Guide_for_Patients_Who_Can_Get_pregnant.pdf'
          )
        },
        {
          label: 'Contraceptive Counseling Guide',
          type: 'absolute',
          url: new URL(
            'https://www.accessdata.fda.gov/drugsatfda_docs/rems/Isotretinoin_2021_10_8_Contraception_Counseling_Guide.pdf'
          )
        }
      ],
      stakeholderType: 'patient',
      summary: 'iPledge/Isotretinoin REMS Patient Requirements'
    },
    {
      links: [
        {
          label: 'Prescriber Guide',
          type: 'absolute',
          url: new URL(
            'https://www.accessdata.fda.gov/drugsatfda_docs/rems/Isotretinoin_2021_10_8_Prescriber_Guide.pdf'
          )
        },
        {
          label: 'Prescriber Comprehension',
          type: 'absolute',
          url: new URL(
            'https://www.accessdata.fda.gov/drugsatfda_docs/rems/Isotretinoin_2021_10_8_Comprehension_Questions.pdf'
          )
        }
      ],
      stakeholderType: 'prescriber',
      summary: 'iPledge/Isotretinoin REMS Provider Requirements'
    }
  ],
  '1237051': [
    {
      links: [
        {
          label: 'Documentation Requirements',
          type: 'absolute',
          url: new URL(
            'https://www.accessdata.fda.gov/drugsatfda_docs/rems/TIRF_2022_08_17_REMS_Document.pdf'
          )
        },
        {
          label: 'Patient Counseling Guide',
          type: 'absolute',
          url: new URL(
            'https://www.accessdata.fda.gov/drugsatfda_docs/rems/TIRF_2022_08_17_Patient_Counseling_Guide.pdf'
          )
        },
        {
          label: 'Patient FAQ',
          type: 'absolute',
          url: new URL(
            'https://tirfstorageproduction.blob.core.windows.net/tirf-public/tirf-patientfaq-frequently-asked-questions.pdf?skoid=417a7522-f809-43c4-b6a8-6b192d44b69e&sktid=59fc620e-de8c-4745-abcc-18182d1bf20e&skt=2022-09-20T19%3A06%3A21Z&ske=2022-09-26T19%3A11%3A21Z&sks=b&skv=2020-04-08&sv=2020-04-08&st=2021-03-21T21%3A27%3A00Z&se=2031-03-21T23%3A59%3A59Z&sr=b&sp=rc&sig=owSGAoUBZuCtsLE41F2XC3o12x%2BG%2Bt5ogykOIt796es%3D'
          )
        }
      ],
      stakeholderType: 'patient',
      summary: 'TIRF REMS Patient Requirements'
    },
    {
      links: [
        {
          label: 'Prescriber Education',
          type: 'absolute',
          url: new URL(
            'https://www.accessdata.fda.gov/drugsatfda_docs/rems/TIRF_2022_08_17_Prescriber_Education.pdf'
          )
        },
        {
          label: 'Prescriber FAQ',
          type: 'absolute',
          url: new URL(
            'https://tirfstorageproduction.blob.core.windows.net/tirf-public/tirf-prfaq-frequently-asked-questions.pdf?skoid=417a7522-f809-43c4-b6a8-6b192d44b69e&sktid=59fc620e-de8c-4745-abcc-18182d1bf20e&skt=2022-09-20T19%3A06%3A53Z&ske=2022-09-26T19%3A11%3A53Z&sks=b&skv=2020-04-08&sv=2020-04-08&st=2021-03-21T21%3A35%3A43Z&se=2031-03-21T23%3A59%3A59Z&sr=b&sp=rc&sig=fqtDzsm7qi1G8MKau210Y3gNet%2Fi20zw2EThKODdEUM%3D'
          )
        }
      ],
      stakeholderType: 'prescriber',
      summary: 'TIRF REMS Prescriber Requirements'
    }
  ]
};
// TODO: No hardcoding of valid codes
const validCodes: Coding[] = [
  {
    code: '2183126', // Turalio
    system: 'http://www.nlm.nih.gov/research/umls/rxnorm'
  },
  {
    code: '1237051', // TIRF
    system: 'http://www.nlm.nih.gov/research/umls/rxnorm'
  },
  {
    code: '6064', // iPledge
    system: 'http://www.nlm.nih.gov/research/umls/rxnorm'
  }
];

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

  function createSmartLink(requirementName: string, appContext: string, request: MedicationRequest) {
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
    const context = req.body.context;
    const contextRequest = context.draftOrders?.entry?.[0].resource;
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

      // find the drug in the medicationCollection to get the smart links
      const drug = await medicationCollection
        .findOne({
          code: medicationCode.code,
          codeSystem: medicationCode.system
        })
        .exec();

      // find a matching rems case for the patient and this drug to only return needed results
      const patientName = patient?.name?.[0];
      const etasu = await remsCaseCollection
        .findOne({
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

          var smartLinkCount = 0;

          // process the smart links from the medicationCollection
          // TODO: smart links should be built with discovered questionnaires, not hard coded ones
          for (const requirement of drug?.requirements) {
            if (requirement.stakeholderType == rule.stakeholderType) {

              // only add the link if the form has not already been processed / received
              if (etasu) {
                var found = false;
                for (const metRequirement of etasu?.metRequirements) {
                  if (metRequirement.requirementName == requirement.name) {
                    found = true;
                    if (!metRequirement.completed) {
                      card.addLink(createSmartLink(requirement.name, requirement.appContext, contextRequest));
                      smartLinkCount++;
                    }
                  }
                }
                if (!found) {
                  card.addLink(createSmartLink(requirement.name, requirement.appContext, contextRequest));
                  smartLinkCount++;
                }
              } else { // if (etasu)
                // add all the links if no etasu to check
                card.addLink(createSmartLink(requirement.name, requirement.appContext, contextRequest));
                smartLinkCount++;
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
