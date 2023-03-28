import mongoose, { model } from 'mongoose';
import { QuestionnaireResponse } from 'fhir/r4';
import Identifier from '../models/Identifier';
import Reference from '../models/Reference';
import canonical from '../models/canonical';
import QuestionnaireResponse_Item from '../models/QuestionnaireResponse_Item';

function QuestionnaireResponseSchema() {
  const QuestionnaireResponseInterface = {
    id: {
      type: String,
      unique: true,
      index: true
    },
    resourceType: {
      type: String,
      required: true
    },
    identifier: {
      type: Identifier,
      default: void 0
    },
    basedOn: {
      type: [Reference],
      default: void 0
    },
    partOf: {
      type: [Reference],
      default: void 0
    },
    questionnaire: {
      type: String,
      default: void 0
    },
    status: {
      type: String,
      default: void 0
    },
    subject: {
      type: Reference,
      default: void 0
    },
    encounter: {
      type: Reference,
      default: void 0
    },
    authored: {
      type: Date,
      default: void 0
    },
    author: {
      type: Reference,
      default: void 0
    },
    source: {
      type: Reference,
      default: void 0
    },
    item: {
      type: [QuestionnaireResponse_Item],
      default: void 0
    }
  };
  return new mongoose.Schema<QuestionnaireResponse>(QuestionnaireResponseInterface, { versionKey: false });
}

const QuestionnaireResponseModel = model<QuestionnaireResponse>('QuestionnaireResponse', QuestionnaireResponseSchema());
export default QuestionnaireResponseModel;
