import mongoose from 'mongoose';
import { UsageContext } from 'fhir/r4';
import Coding from './Coding';
import CodeableConcept from './CodeableConcept';
import Quantity from './Quantity';
import Range from './Range';
import Reference from './Reference';
export default new mongoose.Schema<UsageContext>(
  {
    code: {
      type: Coding,
      default: void 0
    },
    valueCodeableConcept: {
      type: CodeableConcept,
      default: void 0
    },
    valueQuantity: {
      type: Quantity,
      default: void 0
    },
    valueRange: {
      type: Range,
      default: void 0
    },
    valueReference: {
      type: Reference,
      default: void 0
    }
  },
  { _id: false }
);
