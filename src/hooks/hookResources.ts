import { MedicationRequest, Coding } from 'fhir/r4';
import { Link } from '../cards/Card';
import { TypedRequestBody } from '../rems-cds-hooks/resources/HookTypes';
import axios from 'axios';

export interface CardRule {
  links: Link[];
  summary?: string;
  stakeholderType?: string;
}
export const CARD_DETAILS = 'Documentation Required, please complete form via Smart App link.';
// TODO: this codemap should be replaced with a system similar to original CRD's questionnaire package operation
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
  }
];

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

/*
 * Retrieve the coding for the medication from the medicationCodeableConcept if available.
 * Read coding from contained Medication matching the medicationReference otherwise.
 */
export function getDrugCodeFromMedicationRequest(medicationRequest: MedicationRequest) {
  if (medicationRequest) {
    if (medicationRequest?.medicationCodeableConcept) {
      console.log('Get Medication code from CodeableConcept');
      return medicationRequest?.medicationCodeableConcept?.coding?.[0];
    } else if (medicationRequest?.medicationReference) {
      const reference = medicationRequest?.medicationReference;
      let coding = null;
      medicationRequest?.contained?.every(e => {
        if (e.resourceType + '/' + e.id === reference.reference) {
          if (e.resourceType === 'Medication') {
            console.log('Get Medication code from contained resource');
            coding = e.code?.coding?.[0];
          }
        }
      });
      return coding;
    }
  }
  return null;
}
