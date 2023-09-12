import { Document, Schema, model } from 'mongoose';

interface Medication extends Document {
  name: string;
  codeSystem: string;
  code: string;
  requirements: any;
}

interface MetRequirements extends Document {
  completed: boolean;
  completedQuestionnaire: any;
  requirementName: string;
  requirementDescription: string;
  drugName: string;
  stakeholderId: string;
  case_numbers: any;
}

interface RemsCase extends Document {
  case_number: string;
  status: string;
  drugName: string;
  drugCode: string;
  patientFirstName: string;
  patientLastName: string;
  patientDOB: string;
  metRequirements: any;
}

const medicationCollectionSchema = new Schema<Medication>({
  name: { type: 'String' },
  codeSystem: { type: 'string' },
  code: { type: 'string' },
  requirements: {
    type: 'array',
    items: {
      type: 'object',
      properties: {
        name: { type: 'string' },
        description: { type: 'string' },
        questionnaire: { type: 'object' },
        stakeholderType: { type: 'string' },
        createNewCase: { type: 'boolean' },
        resourceId: { type: 'string' },
        requiredToDispense: { type: 'boolean' },
        appContext: { type: 'string' }
      }
    }
  }
});

medicationCollectionSchema.index({ name: 1 }, { unique: true });

export const medicationCollection = model<Medication>(
  'medicationCollection',
  medicationCollectionSchema
);

const metRequirementsSchema = new Schema<MetRequirements>({
  completed: { type: 'boolean' },
  completedQuestionnaire: { type: 'object' },
  requirementName: { type: 'string' },
  requirementDescription: { type: 'string' },
  drugName: { type: 'string' },
  stakeholderId: { type: 'string' },
  case_numbers: { type: 'array', items: { type: 'string' } }
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
  case_number: { type: 'string' },
  status: { type: 'string' },
  drugName: { type: 'string' },
  patientFirstName: { type: 'string' },
  patientLastName: { type: 'string' },
  patientDOB: { type: 'string' },
  drugCode: { type: 'string' },
  metRequirements: {
    type: 'array',
    items: {
      type: 'object',
      properties: {
        metRequirementId: { type: 'number' },
        completed: { type: 'boolean' },
        stakeholderId: { type: 'string' },
        requirementName: { type: 'string' },
        requirementDescription: { type: 'string' }
      }
    }
  }
});

export const remsCaseCollection = model<RemsCase>('RemsCaseCollection', remsCaseCollectionSchema);
