import mongoose from 'mongoose';
import { QuestionnaireItemInitial } from 'fhir/r4';
import Attachment from './Attachment';
import Coding from './Coding';
import Quantity from './Quantity';
import Reference from './Reference';
export default new mongoose.Schema<QuestionnaireItemInitial>({
  valueBoolean: {
    type: Boolean,
    default: void 0
  },
  valueDecimal: {
    type: Number,
    default: void 0
  },
  valueInteger: {
    type: Number,
    default: void 0
  },
  valueDate: {
    type: String,
    default: void 0
  },
  valueDateTime: {
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
  valueUri: {
    type: String,
    default: void 0
  },
  valueAttachment: {
    type: Attachment,
    default: void 0
  },
  valueCoding: {
    type: Coding,
    default: void 0
  },
  valueQuantity: {
    type: Quantity,
    default: void 0
  },
  valueReference: {
    type: Reference,
    default: void 0
  }
});
