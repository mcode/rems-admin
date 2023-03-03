import mongoose from 'mongoose';
import { QuestionnaireItemAnswerOption } from 'fhir/r4';
import Coding from './Coding';
import Reference from './Reference';
export default new mongoose.Schema<QuestionnaireItemAnswerOption>({
  valueInteger: {
    type: Number,
    default: void 0
  },
  valueDate: {
    type: String,
    default: void 0
  },
  valueTime: {
    type: String,
    default: void 0
  },
  valueString: {
    type: String,
    default: void 0
  },
  valueCoding: {
    type: Coding,
    default: void 0
  },
  valueReference: {
    type: Reference,
    default: void 0
  },
  initialSelected: {
    type: Boolean,
    default: void 0
  }
});
