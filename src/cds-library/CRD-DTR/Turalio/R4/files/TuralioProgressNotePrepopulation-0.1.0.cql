library TuralioProgressNotePrepopulation  version '0.1.0'
using FHIR version '4.0.0'
include FHIRHelpers version '4.0.0' called FHIRHelpers
include CDS_Connect_Commons_for_FHIRv400 version '1.0.2' called CDS
include DTRHelpers version '0.1.0' called DTR


codesystem "ICD-10-CM": 'http://hl7.org/fhir/sid/icd-10-cm'
codesystem "LOINC": 'http://loinc.org'
codesystem "SNOMED-CT": 'http://snomed.info/sct'
codesystem "RXNORM": 'http://www.nlm.nih.gov/research/umls/rxnorm'
codesystem "CPT": 'http://www.ama-assn.org/go/cpt'

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
code "LiverUltrasound": '105377009' from "SNOMED-CT"
code "LiverImaging": '441802002' from "SNOMED-CT"
code "LiverBiopsy": '86259008' from "SNOMED-CT"
code "ERCP": '386718000' from "SNOMED-CT"
code "HIDA": '78226' from "CPT"
code "Ursodiol":  '11065' from "RXNORM"
code "InjuryOfLiver": '39400004' from "SNOMED-CT"

parameter medication_request MedicationRequest
parameter medication_dispense MedicationDispense

context Patient

define "IsPatientAlive": 
  if Patient.deceased.value = true or Patient.deceased.value < Now()
    then false
  else
    true
define "MedReqId": MedicationRequest.id
define "PatientGender": Patient.gender.value

define "AltResource": MostRecent([Observation: "ALT"])
define "AlpResource": MostRecent([Observation: "ALP"])
define "AstResource": MostRecent([Observation: "AST"])
define "TbilResource": MostRecent([Observation: "TotalBilirubin"])
define "DbilResource": MostRecent([Observation: "DirectBilirubin"])
define "GgtResource": MostRecent([Observation: "GGT"])
define "UrsodiolStatement": Last([MedicationStatement] M 
  where (M.status.value = 'completed' 
    or M.status.value = 'active')
    and M.reasonCode[0].coding[0].code.value ~ '39400004'
    sort by 'effective')
define "LiverUltrasoundProcedure": Exists(MostRecentProcedure([Procedure: "LiverUltrasound"] L where L.status.value = 'completed'))
define "LiverImagingProcedure": Exists(MostRecentProcedure([Procedure: "LiverImaging"] L where L.status.value = 'completed'))
define "LiverBiopsyProcedure": Exists(MostRecentProcedure([Procedure: "LiverBiopsy"] L where L.status.value = 'completed'))
define "EndoscopicProcedure":  Exists(MostRecentProcedure([Procedure: "ERCP"] L where L.status.value = 'completed'))
define "HIDAScan":  Exists(MostRecentProcedure([Procedure: "HIDA"] L where L.status.value = 'completed'))

define "UsedUrsodiol": Exists(UrsodiolStatement)
define "UrsodiolText": UrsodiolStatement.dosage[0].text.value + ' starting on ' + ToString(UrsodiolStatement.effective.value)
define "AltUln": IsNotWithinUln(AltResource, 3)
define "AlpUln": IsNotWithinUln(AlpResource, 3)
define "AstUln": IsNotWithinUln(AstResource, 3)
define "TbilUln": IsNotWithinUln(TbilResource, 2)
define "AltOrAstWithTbil": (AltUln or AstUln) and TbilUln
define "AltOrAstNoTBIL": IsNotWithinUln(AltResource, 10) or IsNotWithinUln(AstResource, 10)
define "TbilWithoutAltOrAst": IsNotWithinUln(TbilResource, 2.0) or IsNotWithinUln(TbilResource, 1.5)
define "AlpWithGgt": IsNotWithinUln(AlpResource, 2.0) and IsNotWithinUln(GgtResource, 2.0)

define function MostRecent(ObsList List<Observation>):
  Last(ObsList O sort by Coalesce(
    (effective as FHIR.dateTime).value,
    (effective as FHIR.instant).value,
    (effective as FHIR.Period)."end".value,
    (effective as FHIR.Period)."start".value,
    issued.value)
  )
define function MostRecentProcedure(ProcList List<Procedure>):
  Last(ProcList P sort by Coalesce(
    (performed as FHIR.dateTime).value,
    (performed as FHIR.Period)."end".value,
    (performed as FHIR.Period)."start".value)
  )
define function IsNotWithinUln(Obs Observation, mult Decimal):
  if exists(Last(Obs.referenceRange).high)
    then if Last(Obs.referenceRange).high.unit.value = Obs.value.unit.value
      then Obs.value.value.value > Last(Obs.referenceRange).high.value.value * mult 
    else
      null
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
