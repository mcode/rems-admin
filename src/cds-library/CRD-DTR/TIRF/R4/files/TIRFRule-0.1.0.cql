library TIRFRule version '0.1.0'
using FHIR version '4.0.0'
include FHIRHelpers version '4.0.0' called FHIRHelpers


parameter Patient Patient
parameter medication_request MedicationRequest
parameter medication_dispense MedicationDispense
parameter medication_statement MedicationStatement

define RULE_APPLIES:
    true

define PRIORAUTH_REQUIRED:
  false

define DOCUMENTATION_REQUIRED:
  true

define RESULT_InfoLink:
    'https://www.accessdata.fda.gov/drugsatfda_docs/rems/TIRF_2022_08_17_REMS_Document.pdf'
define INFO_PATIENT_PatientCounselingGuide:
    'https://www.accessdata.fda.gov/drugsatfda_docs/rems/TIRF_2022_08_17_Patient_Counseling_Guide.pdf'
define INFO_PATIENT_PatientFAQ:
    'https://tirfstorageproduction.blob.core.windows.net/tirf-public/tirf-patientfaq-frequently-asked-questions.pdf?skoid=417a7522-f809-43c4-b6a8-6b192d44b69e&sktid=59fc620e-de8c-4745-abcc-18182d1bf20e&skt=2022-09-20T19%3A06%3A21Z&ske=2022-09-26T19%3A11%3A21Z&sks=b&skv=2020-04-08&sv=2020-04-08&st=2021-03-21T21%3A27%3A00Z&se=2031-03-21T23%3A59%3A59Z&sr=b&sp=rc&sig=owSGAoUBZuCtsLE41F2XC3o12x%2BG%2Bt5ogykOIt796es%3D'
define INFO_PRESCRIBER_PrescriberEducation:
    'https://www.accessdata.fda.gov/drugsatfda_docs/rems/TIRF_2022_08_17_Prescriber_Education.pdf'
define INFO_PRESCRIBER_PrescriberFAQ:
    'https://tirfstorageproduction.blob.core.windows.net/tirf-public/tirf-prfaq-frequently-asked-questions.pdf?skoid=417a7522-f809-43c4-b6a8-6b192d44b69e&sktid=59fc620e-de8c-4745-abcc-18182d1bf20e&skt=2022-09-20T19%3A06%3A53Z&ske=2022-09-26T19%3A11%3A53Z&sks=b&skv=2020-04-08&sv=2020-04-08&st=2021-03-21T21%3A35%3A43Z&se=2031-03-21T23%3A59%3A59Z&sr=b&sp=rc&sig=fqtDzsm7qi1G8MKau210Y3gNet%2Fi20zw2EThKODdEUM%3D'

define RESULT_QuestionnaireOrderUri:
    'Questionnaire/TIRFRemsPatientEnrollment'

define RESULT_QuestionnairePrescriberEnrollmentUri:
    'Questionnaire/TIRFPrescriberEnrollmentForm'

define RESULT_QuestionnairePrescriberKnowledgeAssessmentUri:
    'Questionnaire/TIRFPrescriberKnowledgeAssessment'

define RESULT_requestId:
  medication_request

define RESULT_dispense:
  medication_dispense