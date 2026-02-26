import { Questionnaire, QuestionnaireResponse } from 'fhir/r4';
import { Schema, model, Document } from 'mongoose';

export interface Requirement {
  name: string;
  description: string;
  questionnaire: Questionnaire | null;
  stakeholderType: 'patient' | 'prescriber' | 'pharmacist' | string;
  createNewCase: boolean;
  resourceId: string;
  requiredToDispense: boolean;
  appContext: string | null;
}

export interface Medication extends Document {
  name: string;
  codeSystem: string;
  code: string; // RxNorm code (used for CDS Hooks)
  ndcCode: string; // NDC code (used for NCPDP SCRIPT)
  requirements: Requirement[];
}

export interface MetRequirements extends Document {
  completed: boolean;
  completedQuestionnaire: QuestionnaireResponse | null;
  requirementName: string;
  requirementDescription: string;
  drugName: string;
  stakeholderId: string;
  case_numbers: string[];
  metRequirementId: any;
}

export interface PrescriptionEvent {
  medicationRequestReference: string;
  prescriberId: string;
  pharmacyId?: string;
  timestamp: Date;
  originatingFhirServer?: string;
  caseStatusAtTime: string;
}

export interface RemsCase extends Document {
  case_number: string;
  remsPatientId?: string;
  status: string;
  dispenseStatus: string;
  drugName: string;
  drugCode: string;
  drugNdcCode?: string;
  patientFirstName: string;
  patientLastName: string;
  patientDOB: string;
  currentPrescriberId?: string;
  currentPharmacyId?: string;
  prescriberHistory: string[];
  pharmacyHistory: string[];
  prescriptionEvents: PrescriptionEvent[];
  medicationRequestReference?: string;
  originatingFhirServer?: string;
  metRequirements: Partial<MetRequirements>[];
}

const medicationCollectionSchema = new Schema<Medication>({
  name: { type: String },
  codeSystem: { type: String },
  code: { type: String },
  ndcCode: { type: String },
  requirements: [
    {
      name: { type: String },
      description: { type: String },
      questionnaire: { type: Schema.Types.Mixed, default: null },
      stakeholderType: { type: String },
      createNewCase: { type: Boolean },
      resourceId: { type: String },
      requiredToDispense: { type: Boolean },
      appContext: { type: String, default: null }
    }
  ]
});

medicationCollectionSchema.index({ name: 1 }, { unique: true });
medicationCollectionSchema.index({ code: 1 });
medicationCollectionSchema.index({ ndcCode: 1 });

export const medicationCollection = model<Medication>(
  'medicationCollection',
  medicationCollectionSchema
);

const metRequirementsSchema = new Schema<MetRequirements>({
  completed: { type: Boolean },
  completedQuestionnaire: { type: Schema.Types.Mixed, default: null },
  requirementName: { type: String },
  requirementDescription: { type: String },
  drugName: { type: String },
  stakeholderId: { type: String },
  case_numbers: [{ type: String }]
});

metRequirementsSchema.index(
  { drugName: 1, requirementName: 1, stakeholderId: 1 },
  { unique: true }
);

export const metRequirementsCollection = model<MetRequirements>(
  'metRequirementsCollection',
  metRequirementsSchema
);

const remsCaseCollectionSchema = new Schema<RemsCase>({
  case_number: { type: String },
  remsPatientId: { type: String },
  status: { type: String },
  dispenseStatus: { type: String },
  drugName: { type: String },
  patientFirstName: { type: String },
  patientLastName: { type: String },
  patientDOB: { type: String },
  drugCode: { type: String },
  drugNdcCode: { type: String },
  currentPrescriberId: { type: String },
  currentPharmacyId: { type: String },
  prescriberHistory: [{ type: String }],
  pharmacyHistory: [{ type: String }],
  prescriptionEvents: [
    {
      medicationRequestReference: { type: String },
      prescriberId: { type: String },
      pharmacyId: { type: String },
      timestamp: { type: Date },
      originatingFhirServer: { type: String },
      caseStatusAtTime: { type: String }
    }
  ],
  medicationRequestReference: { type: String },
  originatingFhirServer: { type: String },
  metRequirements: [
    {
      metRequirementId: { type: String },
      completed: { type: Boolean },
      stakeholderId: { type: String },
      requirementName: { type: String },
      requirementDescription: { type: String }
    }
  ]
});

remsCaseCollectionSchema.index({
  patientFirstName: 1,
  patientLastName: 1,
  patientDOB: 1,
  drugNdcCode: 1
});

remsCaseCollectionSchema.index({
  patientFirstName: 1,
  patientLastName: 1,
  patientDOB: 1,
  drugCode: 1
});

export const remsCaseCollection = model<RemsCase>('RemsCaseCollection', remsCaseCollectionSchema);