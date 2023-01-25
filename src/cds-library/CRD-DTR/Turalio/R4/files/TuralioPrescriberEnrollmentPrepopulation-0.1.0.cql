library TuralioPrescriberEnrollmentPrepopulation  version '0.1.0'
using FHIR version '4.0.0'
include FHIRHelpers version '4.0.0' called FHIRHelpers


codesystem "ICD-10-CM": 'http://hl7.org/fhir/sid/icd-10-cm'
codesystem "LOINC": 'http://loinc.org'
codesystem "SNOMED-CT": 'http://snomed.info/sct'
codesystem "RXNORM": 'http://www.nlm.nih.gov/research/umls/rxnorm'

valueset "TuralioValueSet": 'https://cts.nlm.nih.gov/fhir/ValueSet/2.16.840.1.113762.1.4.1219.197'


code "Oncologist":'394592004' from "SNOMED-CT"

parameter device_request DeviceRequest
parameter service_request ServiceRequest
parameter medication_request MedicationRequest

context Patient

define Today: Today()

define "SigningProviderReference": Coalesce(device_request.performer.reference.value, service_request.performer.reference.value, medication_request.requester.reference.value)
// Get Practitioner
define OrderingProvider: singleton from (
  [Practitioner] practitioner
    where ('Practitioner/' + practitioner.id) =  SigningProviderReference)

define Qualifications: singleton from (
    "OrderingProvider".qualification[0].code.coding[0].code.value)

define Credentials: {Qualifications}

define PractitionerRole: singleton from (
  [PractitionerRole] prole
    where (prole.practitioner.reference.value) = SigningProviderReference)

define Specialty:  FHIRHelpers.ToConcept("PractitionerRole".specialty[0] as FHIR.CodeableConcept).codes

define PreferredCommunication: {(singleton from (
  "OrderingProvider".telecom telecom where telecom.rank.value = 1)).system.value}

define OrgName: ([Organization] org).name.value

define MD: (singleton from (
  "OrderingProvider".identifier identifier
    where identifier.type.coding[0].code = 'MD')).value.value


//retrieve a collection of instances that align with Turalio prescriber certification
define ValidTuralioCredentials: 
  from "OrderingProvider".qualification qualification 
    where qualification.identifier.system.value = 'http://www.nlm.nih.gov/research/umls/rxnorm' and qualification.identifier.value.value = '2183126'

//when empty, all accesses are null and so prepopulation will be blank
define ThirdPartyCredentials: ValidTuralioCredentials[0].code.text.value
define ThirdPartyIssuer: ValidTuralioCredentials[0].issuer.display.value




