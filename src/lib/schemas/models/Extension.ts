import mongoose from 'mongoose';
import { Extension } from 'fhir/r4';
import Expression from './Expression';
import CodeableConcept from './CodeableConcept';
import Coding from './Coding';
import Reference from './Reference';
export default new mongoose.Schema<Extension>(
  {
    url: {
      type: String,
      default: void 0
    },
    valueCanonical: {
      type: String,
      default: void 0
    },
    valueExpression: {
      type: Expression,
      default: void 0
    },
    valueCodeableConcept: {
      type: CodeableConcept,
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
    }
  },
  { _id: false }
);
