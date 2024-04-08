import { Questionnaire, QuestionnaireResponse } from 'fhir/r4';
import { Schema, model, Document } from 'mongoose';

export interface Requirement {
  name: string;
  description: string;
  questionnaire: Questionnaire | null;
  stakeholderType: 'patient' | 'prescriber' | 'pharmacist' | string; // From fhir4.Parameters.parameter.name
  createNewCase: boolean;
  resourceId: string;
  requiredToDispense: boolean;
  appContext: string | null;
}

export interface Medication extends Document {
  name: string;
  codeSystem: string;
  code: string;
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
  metRequirementId: string;
}

export interface RemsCase extends Document {
  case_number: string;
  status: string;
  drugName: string;
  drugCode: string;
  patientFirstName: string;
  patientLastName: string;
  patientDOB: string;
  metRequirements: Partial<MetRequirements>[];
}

const medicationCollectionSchema = new Schema<Medication>({
  name: { type: String },
  codeSystem: { type: String },
  code: { type: String },
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
  status: { type: String },
  drugName: { type: String },
  patientFirstName: { type: String },
  patientLastName: { type: String },
  patientDOB: { type: String },
  drugCode: { type: String },
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

export const remsCaseCollection = model<RemsCase>('RemsCaseCollection', remsCaseCollectionSchema);
