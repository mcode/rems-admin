import mongoose from 'mongoose';
import { Identifier } from 'fhir/r4';
import CodeableConcept from './CodeableConcept';
import Period from './Period';
import Reference from './Reference';
const ident = new mongoose.Schema<Identifier>(
  {
    use: {
      type: String,
      default: void 0
    },
    type: CodeableConcept,
    system: {
      type: String,
      default: void 0
    },
    value: {
      type: String,
      default: void 0
    },
    period: {
      type: Period,
      default: void 0
    }
  },
  { _id: false }
);

ident.add({
  assigner: {
    type: Reference,
    default: void 0
  }
});
export default ident;
