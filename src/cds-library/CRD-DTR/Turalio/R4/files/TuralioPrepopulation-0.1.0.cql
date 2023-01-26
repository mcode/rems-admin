library TuralioPrepopulation  version '0.1.0'
using FHIR version '4.0.0'
include FHIRHelpers version '4.0.0' called FHIRHelpers
include CDS_Connect_Commons_for_FHIRv400 version '1.0.2' called CDS
include DTRHelpers version '0.1.0' called DTR

codesystem "ICD-10-CM": 'http://hl7.org/fhir/sid/icd-10-cm'
codesystem "LOINC": 'http://loinc.org'
codesystem "SNOMED-CT": 'http://snomed.info/sct'
codesystem "RXNORM": 'http://www.nlm.nih.gov/research/umls/rxnorm'


valueset "HepaticMedicalHistory": 'https://cts.nlm.nih.gov/fhir/ValueSet/2.16.840.1.113762.1.4.1219.198'
valueset "TuralioValueSet": 'https://cts.nlm.nih.gov/fhir/ValueSet/2.16.840.1.113762.1.4.1219.197'

code "29463-7": '29463-7' from "LOINC"
code "2183102": '2183102' from "RXNORM"
code "AST": '1920-8' from "LOINC"
code "ALT": '1742-6' from "LOINC"
code "GGT": '2324-2' from "LOINC"
code "TotalBilirubin": '1975-2' from "LOINC"
code "DirectBilirubin": '1968-7' from "LOINC"
code "ALP": '13874-3' from "LOINC"
code "Albumin": '1751-7' from "LOINC"
code "PT": '5902-2' from "LOINC"

parameter medication_request MedicationRequest
parameter medication_dispense MedicationDispense

context Patient

// get observations 
define "WeightList": [Observation: "29463-7"]
define "LatestWeight": CDS.MostRecent(CDS.WithUnit(CDS.Verified("WeightList"),'mg'))
define "LatestWeightResult": DTR.GetObservationValue("LatestWeight")

define "Turalio": [MedicationStatement: "TuralioValueSet"]
define "TakingTuralio": exists("Turalio")
define "TuralioDate": 
  if "TakingTuralio" 
    then First("Turalio").effective.value
  else
    null

define "LatestAST": CDS.MostRecent(CDS.WithUnit(CDS.Verified([Observation: "AST"]), 'U/L'))
define "ASTResult": (convert DTR.GetObservationValue("LatestAST") to String) + ' U/L'
define "ASTDate": 
  if exists("LatestAST")
    then "LatestAST".issued.value
  else
    null

define "LatestALT": CDS.MostRecent(CDS.WithUnit(CDS.Verified([Observation: "ALT"]), 'U/L'))
define "ALTResult": (convert DTR.GetObservationValue("LatestALT") to String) + ' U/L'
define "ALTDate": 
  if exists("LatestALT")
    then "LatestALT".issued.value
  else
    null

define "LatestGGT": CDS.MostRecent(CDS.WithUnit(CDS.Verified([Observation: "GGT"]), 'U/L'))
define "GGTResult": (convert DTR.GetObservationValue("LatestGGT") to String) + ' U/L'
define "GGTDate": 
  if exists("LatestGGT")
    then "LatestGGT".issued.value
  else
    null

define "LatestTotalBilirubin": CDS.MostRecent(CDS.WithUnit(CDS.Verified([Observation: "TotalBilirubin"]), 'mg/dL'))
define "TotalBilirubinResult": (convert DTR.GetObservationValue("LatestTotalBilirubin") to String) + ' mg/dL'
define "TotalBilirubinDate": 
  if exists("LatestTotalBilirubin")
    then "LatestTotalBilirubin".issued.value
  else
    null

define "LatestDirectBilirubin": CDS.MostRecent(CDS.WithUnit(CDS.Verified([Observation: "DirectBilirubin"]), 'mg/dL'))
define "DirectBilirubinResult": (convert DTR.GetObservationValue("LatestDirectBilirubin") to String) + ' mg/dL'
define "DirectBilirubinDate": 
  if exists("LatestDirectBilirubin")
    then "LatestDirectBilirubin".issued.value
  else
    null

define "LatestALP": CDS.MostRecent(CDS.WithUnit(CDS.Verified([Observation: "ALP"]), 'U/L'))
define "ALPResult": (convert DTR.GetObservationValue("LatestALP") to String) + ' U/L'
define "ALPDate": 
  if exists("LatestALP")
    then "LatestALP".issued.value
  else
    null

define "LatestAlbumin": CDS.MostRecent(CDS.WithUnit(CDS.Verified([Observation: "Albumin"]), 'g/dL'))
define "AlbuminResult": (convert DTR.GetObservationValue("LatestAlbumin") to String) + ' g/dL'
define "AlbuminDate": 
  if exists("LatestAlbumin")
    then "LatestAlbumin".issued.value
  else
    null

define "LatestPT": CDS.MostRecent(CDS.WithUnit(CDS.Verified([Observation: "PT"]), 's'))
define "PTResult": (convert DTR.GetObservationValue("LatestPT") to String) + ' s'
define "PTDate": 
  if exists("LatestPT")
    then "LatestPT".issued.value
  else
    null

define "MedList": [MedicationStatement] M
  where M.status.value = 'active'

define "TakingMeds": not exists("MedList")
define function GetMedicationsTupleList(MedStatementList List<MedicationStatement>):
  distinct(
    flatten(
      MedStatementList MedStatement
        let MedicationList:
          (MedStatement.medication.coding) CODING
          return (FHIRHelpers.ToCode(CODING).display + ' - ' + FHIRHelpers.ToCode(CODING).code)

        return MedicationList  
    )
  )   
define "Meds": GetMedicationsTupleList(MedList)
define "MedsString": 
  Meds M
    aggregate Result starting '': Result + ', ' + M

define "MedicalHistoryList": [Condition: "HepaticMedicalHistory"]
define "MedicalHistory": DTR.CodesFromConditions(CDS.Confirmed("MedicalHistoryList"))