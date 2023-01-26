library IPledgeRule version '0.1.0'
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
    'https://www.accessdata.fda.gov/drugsatfda_docs/rems/Isotretinoin_2021_10_8_REMS_Document.pdf'

define INFO_PATIENT_FactSheet:
    'https://www.accessdata.fda.gov/drugsatfda_docs/rems/Isotretinoin_2021_10_8_Fact_Sheet.pdf'

define INFO_PATIENT_GuideForPatientsWhoCanGetPregnant:
    'https://www.accessdata.fda.gov/drugsatfda_docs/rems/Isotretinoin_2021_10_8_Guide_for_Patients_Who_Can_Get_pregnant.pdf'
define INFO_PATIENT_ContraceptiveCounselingGuide:
    'https://www.accessdata.fda.gov/drugsatfda_docs/rems/Isotretinoin_2021_10_8_Contraception_Counseling_Guide.pdf'
define INFO_PRESCRIBER_PrescriberGuide:
    'https://www.accessdata.fda.gov/drugsatfda_docs/rems/Isotretinoin_2021_10_8_Prescriber_Guide.pdf'
define INFO_PRESCRIBER_ComprehensionQuestions:
    'https://www.accessdata.fda.gov/drugsatfda_docs/rems/Isotretinoin_2021_10_8_Comprehension_Questions.pdf'

define RESULT_QuestionnaireOrderUri:
    'Questionnaire/IPledgeRemsPatientEnrollment'

define RESULT_QuestionnairePrescriberEnrollmentUri:
    'Questionnaire/IPledgeRemsPrescriberEnrollmentForm'

define RESULT_requestId:
  medication_request

define RESULT_dispense:
  medication_dispense