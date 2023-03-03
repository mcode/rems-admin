import mongoose from 'mongoose';
import { QuestionnaireItemEnableWhen } from 'fhir/r4';
import Coding from './Coding';
import Quantity from './Quantity';
import Reference from './Reference';
export default new mongoose.Schema<QuestionnaireItemEnableWhen>({
  question: {
    type: String,
    default: void 0
  },
  operator: {
    type: String,
    default: void 0
  },
  answerBoolean: {
    type: Boolean,
    default: void 0
  },
  answerDecimal: {
    type: Number,
    default: void 0
  },
  answerInteger: {
    type: Number,
    default: void 0
  },
  answerDate: {
    type: String,
    default: void 0
  },
  answerDateTime: {
    type: String,
    default: void 0
  },
  answerTime: {
    type: String,
    default: void 0
  },
  answerString: {
    type: String,
    default: void 0
  },
  answerCoding: {
    type: Coding,
    default: void 0
  },
  answerQuantity: {
    type: Quantity,
    default: void 0
  },
  answerReference: {
    type: Reference,
    default: void 0
  }
});
