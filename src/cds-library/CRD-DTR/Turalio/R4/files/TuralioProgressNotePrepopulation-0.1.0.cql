library TuralioProgressNotePrepopulation  version '0.1.0'
using FHIR version '4.0.0'
include FHIRHelpers version '4.0.0' called FHIRHelpers

context Patient

define "AllDiagnoses": ActiveConfirmedDiagnoses([Condition])

define function ActiveConfirmedDiagnoses(CondList List<FHIR.Condition>):
  distinct(
    flatten(
      CondList C
        let DiagnosesCodings:
          (C.code.coding) CODING where CODING.system.value in {
            'http://hl7.org/fhir/sid/icd-10',
            'http://hl7.org/fhir/sid/icd-10-cm',
            'http://snomed.info/sct'
          }
          return FHIRHelpers.ToCode(CODING)
        where C.verificationStatus.coding.code = 'confirmed'
          and C.clinicalStatus.coding.code in {'active', 'relapse'}
          and exists(DiagnosesCodings)
        return DiagnosesCodings
    )
  )  