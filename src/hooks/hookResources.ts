import {
  MedicationRequest,
  Coding,
  FhirResource,
  Task,
  Patient,
  Organization,
  Bundle,
  Medication,
  BundleEntry
} from 'fhir/r4';
import Card, { Link, Suggestion, Action } from '../cards/Card';
import { HookPrefetch, TypedRequestBody } from '../rems-cds-hooks/resources/HookTypes';
import config from '../config';
import {
  RemsCase,
  Requirement,
  medicationCollection,
  remsCaseCollection,
  Medication as MongooseMedication,
  metRequirementsCollection
} from '../fhir/models';

import axios from 'axios';
import { ServicePrefetch } from '../rems-cds-hooks/resources/CdsService';
import { hydrate } from '../rems-cds-hooks/prefetch/PrefetchHydrator';

type HandleCallback = (
  res: any,
  hydratedPrefetch: HookPrefetch | undefined,
  contextRequest: FhirResource | undefined,
  patient: FhirResource | undefined
) => Promise<void>;

export interface CardRule {
  links: Link[];
  summary?: string;
  stakeholderType?: string;
  cardDetails?: string;
}
export const CARD_DETAILS = 'Documentation Required, please complete form via Smart App link.';
// TODO: this codemap should be replaced with a system similar to original CRD questionnaire package operation
// the app doesn't necessarily have to use CQL for this.
export const codeMap: { [key: string]: CardRule[] } = {
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
      summary: 'Turalio REMS Patient Requirements',
      cardDetails: CARD_DETAILS
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
      summary: 'Turalio REMS Prescriber Requirements',
      cardDetails: CARD_DETAILS
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
      summary: 'iPledge/Isotretinoin REMS Patient Requirements',
      cardDetails: CARD_DETAILS
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
      summary: 'iPledge/Isotretinoin REMS Prescriber Requirements',
      cardDetails: CARD_DETAILS
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
      summary: 'TIRF REMS Patient Requirements',
      cardDetails: CARD_DETAILS
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
      summary: 'TIRF REMS Prescriber Requirements',
      cardDetails: CARD_DETAILS
    }
  ],
  '1666386': [
    {
      links: [
        {
          label: 'Medication Guide',
          type: 'absolute',
          url: new URL(
            'https://www.accessdata.fda.gov/drugsatfda_docs/rems/Addyi_2019_10_09_Medication_Guide.pdf'
          )
        }
      ],
      stakeholderType: '',
      summary: 'Addyi REMS Patient Information',
      cardDetails: 'Please review safety documentation'
    }
  ]
};
// TODO: No hardcoding of valid codes
export const validCodes: Coding[] = [
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
  },
  {
    code: '1666386', // Addyi
    system: 'http://www.nlm.nih.gov/research/umls/rxnorm'
  }
];
const source = {
  label: config.server.name,
  url: new URL('https://github.com/mcode/rems-admin')
};

/*
 * Retrieve the coding for the medication from the medicationCodeableConcept if available.
 * Read coding from contained Medication matching the medicationReference otherwise.
 */
export function getDrugCodeFromMedicationRequest(
  resource: FhirResource | undefined
): Coding | null {
  const medicationRequest =
    resource?.resourceType === 'MedicationRequest' && (resource as MedicationRequest);

  if (!medicationRequest) {
    return null;
  }

  if (medicationRequest.medicationCodeableConcept) {
    return medicationRequest.medicationCodeableConcept?.coding?.[0] || null;
  }

  if (medicationRequest.medicationReference) {
    const reference = medicationRequest.medicationReference;
    const medication = medicationRequest.contained?.find(
      resource =>
        resource.resourceType + '/' + resource.id === reference.reference &&
        resource.resourceType === 'Medication'
    ) as Medication;
    return medication?.code?.coding?.[0] || null;
  }

  return null;
}
export function getFhirResource(token: string, req: TypedRequestBody) {
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
export function createSmartLink(
  requirementName: string,
  appContext: string | null,
  request: MedicationRequest | undefined
) {
  let order;
  if (config.general.fullResourceInAppContext) {
    order = JSON.stringify(request);
  } else {
    order = request?.resourceType + '/' + request?.id;
  }

  const newLink: Link = {
    label: requirementName + ' Form',
    url: new URL(config.smart.endpoint),
    type: 'smart',
    appContext: `${appContext}&order=${order}&coverage=${request?.insurance?.[0].reference}`
  };
  return newLink;
}
export function buildErrorCard(reason: string) {
  const errorCard = new Card('Bad Request', reason, source, 'warning');
  const cards = {
    cards: [errorCard.card]
  };
  return cards;
}

const getErrorCard = (
  hydratedPrefetch: HookPrefetch | undefined,
  contextRequest: FhirResource | undefined
): { cards: Card[] } | null => {
  if (!contextRequest) {
    return buildErrorCard('DraftOrders does not contain a request');
  }

  if (contextRequest && contextRequest.resourceType !== 'MedicationRequest') {
    return buildErrorCard('DraftOrders does not contain a MedicationRequest');
  }

  const prefetchRequest = hydratedPrefetch?.request;

  if (
    prefetchRequest?.id &&
    contextRequest &&
    contextRequest.id &&
    prefetchRequest.id.replace('MedicationRequest/', '') !==
      contextRequest.id.replace('MedicationRequest/', '')
  ) {
    return buildErrorCard('Context draftOrder does not match prefetch MedicationRequest ID');
  }

  const medicationCode = getDrugCodeFromMedicationRequest(contextRequest) as Coding;
  if (!medicationCode?.code) {
    return buildErrorCard('MedicationRequest does not contain a code');
  }

  const shouldReturnCard = validCodes.some(e => {
    return e.code === medicationCode.code && e.system === medicationCode.system;
  });
  if (!shouldReturnCard) {
    return buildErrorCard('Unsupported code');
  }

  return null;
};

// handles order-sign and order-select currently
export const handleCardOrder = async (
  res: any,
  hydratedPrefetch: HookPrefetch | undefined,
  contextRequest: FhirResource | undefined,
  resource: FhirResource | undefined
): Promise<void> => {
  const patient = resource?.resourceType === 'Patient' ? resource : undefined;

  const pharmacy = hydratedPrefetch?.pharmacy as Organization;

  const errorCard = getErrorCard(hydratedPrefetch, contextRequest);
  if (errorCard) {
    res.json(errorCard);
    return;
  }

  // find the drug in the medicationCollection to get the smart links
  const coding = !errorCard && (getDrugCodeFromMedicationRequest(contextRequest) as Coding);
  const { code, system, display } = coding;
  const request = coding && (contextRequest as MedicationRequest);
  const drug = await medicationCollection
    .findOne({
      code: code,
      codeSystem: system
    })
    .exec();

  // find a matching REMS case for the patient and this drug to only return needed results
  const patientName = patient?.name?.[0];
  const patientBirth = patient?.birthDate;
  const remsCase = await remsCaseCollection.findOne({
    patientFirstName: patientName?.given?.[0],
    patientLastName: patientName?.family,
    patientDOB: patientBirth,
    drugCode: code
  });

  const codeRule = (code && codeMap[code]) || [];

  const cardPromises = codeRule.map(
    getCardOrEmptyArrayFromRules(display, drug, remsCase, request, patient, pharmacy)
  );

  const cards: Card[] = (await Promise.all(cardPromises)).flat();

  res.json({ cards });
};

const getCardOrEmptyArrayFromRules =
  (
    display: string | undefined,
    drug: MongooseMedication | null,
    remsCase: RemsCase | null,
    request: MedicationRequest,
    patient: Patient | undefined,
    pharmacy: Organization | undefined
  ) =>
  async (rule: CardRule): Promise<Card | never[]> => {
    let pharmacyInfo = '';
    if (pharmacy && pharmacy) {
      const isCertified = await checkPharmacyCertification(pharmacy, drug?.code); // AWAIT HERE

      const pharmacyName = pharmacy.name || pharmacy.alias?.[0] || 'Selected pharmacy';

      pharmacyInfo = `**Pharmacy Status:** ${pharmacyName} is ${
        isCertified ? 'certified' : 'not yet certified'
      } for ${display} REMS dispensing. This medication ${
        isCertified ? 'can' : 'cannot yet'
      } be dispensed at this location.\n\n`;
    }

    const card = new Card(
      rule.summary || display || 'Rems',
      pharmacyInfo + (rule.cardDetails || CARD_DETAILS),
      source,
      'info'
    );

    // no construction needed
    const absoluteLinks = rule.links.filter(e => e.type === 'absolute');
    card.addLinks(absoluteLinks);

    const requirements =
      drug?.requirements.filter(
        requirement => requirement.stakeholderType === rule.stakeholderType
      ) || [];

    // process the smart links from the medicationCollection
    // TODO: smart links should be built with discovered questionnaires, not hard coded ones
    const predicate = (requirement: Requirement) => {
      const metRequirement =
        remsCase &&
        remsCase.metRequirements.find(
          metRequirement => metRequirement.requirementName === requirement.name
        );
      const formNotProcessed = metRequirement && !metRequirement.completed;
      const notFound = remsCase && !metRequirement;
      const noEtasuToCheckAndRequiredToDispense = !remsCase && requirement.requiredToDispense;

      return formNotProcessed || notFound || noEtasuToCheckAndRequiredToDispense;
    };

    const smartLinks: Link[] = getSmartLinks(requirements, request, predicate);
    card.addLinks(smartLinks);

    const suggestions: Suggestion[] = getSuggestions(requirements, request, patient, predicate);
    card.addSuggestions(suggestions);

    const unmetRequirementSmartLinkCount = smartLinks.length;
    const smartLinkCount = requirements.length;
    const existsSmartLinksToNeededForms = unmetRequirementSmartLinkCount > 0;
    const isInformationOnlyCard = smartLinkCount === 0;

    if (existsSmartLinksToNeededForms || isInformationOnlyCard) {
      return card;
    }

    return [];
  };

const checkPharmacyCertification = async (
  pharmacy: Organization | undefined,
  drugCode: string | undefined
) => {
  if (!pharmacy?.id || !drugCode) {
    return false;
  }

  const drug = await medicationCollection
    .findOne({
      code: drugCode,
      codeSystem: 'http://www.nlm.nih.gov/research/umls/rxnorm'
    })
    .exec();

  if (!drug) {
    return false;
  }

  const requiredPharmacistRequirements = drug.requirements.filter(
    requirement => requirement.stakeholderType === 'pharmacist' && requirement.requiredToDispense
  );

  if (requiredPharmacistRequirements.length === 0) {
    return true;
  }

  const pharmacyId = `Organization/${pharmacy.id}`;

  for (const requirement of requiredPharmacistRequirements) {
    const metRequirement = await metRequirementsCollection
      .findOne({
        stakeholderId: pharmacyId,
        requirementName: requirement.name,
        drugName: drug.name,
        completed: true
      })
      .exec();

    if (!metRequirement) {
      return false;
    }
  }

  return true;
};

const getSmartLinks = (
  requirements: Requirement[],
  request: MedicationRequest,
  predicate: (requirement: Requirement) => boolean
): Link[] => {
  return requirements.map(getLinkOrEmptyArray(request, predicate)).flat() || [];
};

const getSuggestions = (
  requirements: Requirement[],
  request: MedicationRequest,
  patient: Patient | undefined,
  predicate: (requirement: Requirement) => boolean
): Suggestion[] => {
  return (
    (patient && requirements.map(getSuggestionOrEmptyArray(patient, request, predicate)).flat()) ||
    []
  );
};

// handles preliminary card creation.  ALL hooks should go through this function.
// make sure code here is applicable to all supported hooks.
export async function handleCard(
  req: TypedRequestBody,
  res: any,
  hydratedPrefetch: HookPrefetch,
  contextRequest: FhirResource | undefined,
  callback: HandleCallback
) {
  const context = req.body.context;
  const patient = hydratedPrefetch?.patient;
  const practitioner = hydratedPrefetch?.practitioner;

  console.log('    Patient: ' + patient?.id);

  // verify ids
  if (
    patient?.id &&
    patient.id.replace('Patient/', '') !== context.patientId?.replace('Patient/', '')
  ) {
    res.json(buildErrorCard('Context patientId does not match prefetch Patient ID'));
    return;
  }
  if (
    practitioner?.id &&
    practitioner.id.replace('Practitioner/', '') !== context.userId?.replace('Practitioner/', '')
  ) {
    res.json(buildErrorCard('Context userId does not match prefetch Practitioner ID'));
    return;
  }
  return callback(res, hydratedPrefetch, contextRequest, patient);
}

// handles all hooks, any supported hook should pass through this function
export function handleHook(
  req: TypedRequestBody,
  res: any,
  hookPrefetch: ServicePrefetch,
  contextRequest: FhirResource | undefined,
  callback: HandleCallback
) {
  try {
    const fhirUrl = req.body.fhirServer;
    const fhirAuth = req.body.fhirAuthorization;
    if (fhirUrl && fhirAuth && fhirAuth.access_token) {
      hydrate(getFhirResource, hookPrefetch, req.body).then(hydratedPrefetch => {
        handleCard(req, res, hydratedPrefetch, contextRequest, callback);
      });
    } else {
      if (req.body.prefetch) {
        handleCard(req, res, req.body.prefetch, contextRequest, callback);
      } else {
        handleCard(req, res, {}, contextRequest, callback);
      }
    }
  } catch (error) {
    console.log(error);
    res.json(buildErrorCard('Unknown Error'));
  }
}

// process the MedicationRequests to add the Medication into contained resources
const refersToMedication = (entry: BundleEntry<FhirResource>): boolean =>
  entry.resource?.resourceType === 'Medication';

const refersToMedicationRequest = (entry: BundleEntry<FhirResource>): boolean =>
  entry.resource?.resourceType === 'MedicationRequest';

const refersToMedicationWithMedicationReference = (e: BundleEntry<MedicationRequest>): boolean =>
  !!e.resource?.medicationReference;

const isBundleEntryMedicationReferenced =
  (medicationRequestEntry: BundleEntry<MedicationRequest>) =>
  (medicationEntry: BundleEntry<Medication>): boolean =>
    medicationEntry?.resource?.resourceType + '/' + medicationEntry?.resource?.id ===
    medicationRequestEntry.resource?.medicationReference?.reference;

const createBundleEntryWhoseMedicationRequestContainsReferencedMedication =
  (medicationEntries: BundleEntry<Medication>[]) =>
  (medicationRequestEntry: BundleEntry<MedicationRequest>): BundleEntry<MedicationRequest> => {
    if (!medicationRequestEntry.resource) {
      return medicationRequestEntry;
    }
    const referencedMedication = medicationEntries.find(
      isBundleEntryMedicationReferenced(medicationRequestEntry)
    )?.resource;
    const contained = getContained(medicationRequestEntry, referencedMedication);
    const mutatedMedicationRequestEntry: BundleEntry<MedicationRequest> = {
      ...medicationRequestEntry,
      resource: {
        ...medicationRequestEntry.resource,
        contained
      }
    };
    return mutatedMedicationRequestEntry;
  };

const getContained = (
  medicationRequestEntry: BundleEntry<MedicationRequest>,
  referencedMedication: Medication | undefined
): FhirResource[] => {
  const existingContained = medicationRequestEntry.resource?.contained;
  if (existingContained) {
    const foundReferencedMedication = existingContained.find(
      c => c.id === referencedMedication?.id
    );
    if (foundReferencedMedication || !referencedMedication) {
      return existingContained;
    }
    return [...existingContained, referencedMedication];
  }
  if (!referencedMedication) {
    return [];
  }
  return [referencedMedication];
};

const processMedicationRequests = (
  medicationRequestsBundle: Bundle<MedicationRequest | Medication | FhirResource> | undefined
): Bundle<MedicationRequest | Medication | FhirResource> | undefined => {
  if (!medicationRequestsBundle) {
    return undefined;
  }
  const { entry = [], ...rest } = medicationRequestsBundle;
  const medicationRequestEntries = entry.filter(
    refersToMedicationRequest
  ) as BundleEntry<MedicationRequest>[];
  const medicationRequestEntriesWithMedicationReference = medicationRequestEntries.filter(
    refersToMedicationWithMedicationReference
  );
  const medicationEntries = entry.filter(refersToMedication) as BundleEntry<Medication>[];
  const medicationRequestEntriesMutatedWithMedicationReference =
    medicationRequestEntriesWithMedicationReference.map(
      createBundleEntryWhoseMedicationRequestContainsReferencedMedication(medicationEntries)
    );
  const otherEntries = entry.filter(e => !refersToMedication(e) && !refersToMedicationRequest(e));
  const medicationRequestEntriesWithoutMedicationReference = medicationRequestEntries.filter(
    e => !refersToMedicationWithMedicationReference(e)
  );
  return {
    ...rest,
    entry: [
      ...otherEntries,
      ...medicationEntries,
      ...medicationRequestEntriesWithoutMedicationReference,
      ...medicationRequestEntriesMutatedWithMedicationReference
    ]
  };
};

const getSummary = (drugCode: string, drugName: string): string => {
  const codeRule = codeMap[drugCode];
  const rule = codeRule.find(rule => rule.stakeholderType === 'patient');
  const summary = rule?.summary || drugName || 'Rems';
  return summary;
};

const containsMatchingMedicationRequest =
  (drugCode: string) =>
  (entry: BundleEntry): boolean => {
    if (entry.resource?.resourceType === 'MedicationRequest') {
      const medReq: MedicationRequest = entry.resource;
      const medicationCode = getDrugCodeFromMedicationRequest(medReq);
      return drugCode === medicationCode?.code;
    }
    return false;
  };

const getCardOrEmptyArrayFromCases =
  (entries: BundleEntry[] | undefined) =>
  async ({ drugCode, drugName, metRequirements }: RemsCase): Promise<Card | never[]> => {
    // find the drug in the medicationCollection that matches the REMS case to get the smart links
    const drug = await medicationCollection
      .findOne({
        code: drugCode,
        name: drugName
      })
      .exec();

    // get the rule summary from the codemap
    const summary = getSummary(drugCode, drugName);

    // create the card
    const card = new Card(summary, CARD_DETAILS, source, 'info');

    // find the matching MedicationRequest for the context
    const request = (entries || []).find(containsMatchingMedicationRequest(drugCode))?.resource;

    // if no valid request or not a MedicationRequest found skip this REMS case
    if (!request || (request && request.resourceType !== 'MedicationRequest')) {
      return [];
    }

    // grab absolute links relevant to the patient
    const codeRule = codeMap[drugCode];
    const rule = codeRule.find(rule => rule.stakeholderType === 'patient');
    const absoluteLinks = rule?.links || [];
    card.addLinks(absoluteLinks);

    // find all of the matching patient forms
    const requirements =
      drug?.requirements.filter(requirement => requirement.stakeholderType === 'patient') || [];

    // loop through all of the ETASU requirements for this drug
    const predicate = (requirement: Requirement) => {
      // match the requirement to the metRequirement of the REMS case
      const metRequirement = metRequirements.find(metRequirement => {
        return metRequirement.requirementName === requirement.name;
      });
      const formNotProcessed = metRequirement && !metRequirement.completed;
      const notFound = !metRequirement;

      return formNotProcessed || notFound;
    };

    const smartLinks = getSmartLinks(requirements, request, predicate);
    card.addLinks(smartLinks);

    return card;
  };

const getLinkOrEmptyArray =
  (request: MedicationRequest, predicate: (requirement: Requirement) => boolean) =>
  (requirement: Requirement): Link | [] => {
    const link = createSmartLink(requirement.name, requirement.appContext, request);

    if (predicate(requirement)) {
      return link;
    }

    return [];
  };

const getSuggestionOrEmptyArray =
  (
    patient: Patient,
    request: MedicationRequest,
    predicate: (requirement: Requirement) => boolean
  ) =>
  (requirement: Requirement): Suggestion | [] => {
    const suggestion = getQuestionnaireSuggestion(requirement, patient, request);

    if (suggestion && predicate(requirement)) {
      return suggestion;
    }

    return [];
  };

// handles patient-view and encounter-start currently
export const handleCardEncounter = async (
  res: any,
  hookPrefetch: HookPrefetch | undefined,
  _contextRequest: FhirResource | undefined,
  resource: FhirResource | undefined
): Promise<void> => {
  const patient = resource?.resourceType === 'Patient' ? resource : undefined;
  const medResource = hookPrefetch?.medicationRequests;
  const medicationRequestsBundle =
    medResource?.resourceType === 'Bundle'
      ? // process the MedicationRequests to add the Medication into contained resources
        processMedicationRequests(medResource)
      : undefined;

  // find all matching REMS cases for the patient
  const patientName = patient?.name?.[0];
  const patientBirth = patient?.birthDate;
  const remsCaseList = await remsCaseCollection.find({
    patientFirstName: patientName?.given?.[0],
    patientLastName: patientName?.family,
    patientDOB: patientBirth
  });

  // loop through all the REMS cases in the list
  const promises = remsCaseList.map(getCardOrEmptyArrayFromCases(medicationRequestsBundle?.entry));

  const cards = (await Promise.all(promises)).flat();

  res.json({ cards });
};

export const getQuestionnaireSuggestion = (
  requirement: Requirement,
  patient: Patient,
  request: MedicationRequest
): Suggestion | undefined => {
  if (requirement.appContext && requirement.appContext.includes('=')) {
    const qArr = requirement.appContext.split('='); // break up into parts
    let qUrl = null;
    for (let i = 0; i < qArr.length; i++) {
      if (qArr[i].toLowerCase() === 'questionnaire') {
        if (i + 1 < qArr.length) {
          // not at end of array
          qUrl = qArr[i + 1];
        }
      }
    }
    if (qUrl) {
      const action: Action = {
        type: 'create',
        description: `Create task for "completion of ${requirement.name} Questionnaire"`,
        resource: createQuestionnaireCompletionTask(requirement, patient, qUrl, request)
      };
      const suggestion: Suggestion = {
        label: `Add "Completion of ${requirement.name} Questionnaire" to task list`,
        actions: [action]
      };
      return suggestion;
    }
  }
  return undefined;
};

export function createQuestionnaireCompletionTask(
  requirement: Requirement,
  patient: Patient,
  questionnaireUrl: string,
  request: MedicationRequest
) {
  const taskResource: Task = {
    resourceType: 'Task',
    status: 'ready',
    intent: 'order',
    code: {
      coding: [
        {
          system: 'http://hl7.org/fhir/uv/sdc/CodeSystem/temp',
          code: 'complete-questionnaire'
        },
        {
          system: 'http://hl7.org/fhir/smart-app-launch/CodeSystem/smart-codes',
          code: 'launch-app-ehr',
          display: 'Launch application using the SMART EHR launch'
        }
      ]
    },
    description: `Complete ${requirement.name} Questionnaire`,
    for: {
      reference: `${patient.resourceType}/${patient.id}`
    },
    requester: {
      reference: `${request.requester?.reference}`
    },
    authoredOn: `${new Date(Date.now()).toISOString()}`,
    input: [
      {
        type: {
          text: 'questionnaire'
        },
        valueCanonical: `${questionnaireUrl}`
      },
      {
        type: {
          coding: [
            {
              system: 'http://hl7.org/fhir/smart-app-launch/CodeSystem/smart-codes',
              code: 'smartonfhir-application',
              display: 'SMART on FHIR application URL.'
            }
          ]
        },
        valueUrl: config.smart.endpoint
      },
      {
        type: {
          coding: [
            {
              system: 'http://hl7.org/fhir/smart-app-launch/CodeSystem/smart-codes',
              code: 'smartonfhir-appcontext',
              display: 'Application context related to this launch.'
            }
          ]
        },
        valueString: `${requirement.appContext}&order=${JSON.stringify(request)}&coverage=${
          request?.insurance?.[0].reference
        }`
      }
    ]
  };
  return taskResource;
}
