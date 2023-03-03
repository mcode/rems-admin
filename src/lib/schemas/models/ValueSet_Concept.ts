import mongoose from 'mongoose';
import { ValueSetComposeIncludeConcept } from 'fhir/r4';
import ValueSet_Designation from './ValueSet_Designation';
export default new mongoose.Schema<ValueSetComposeIncludeConcept>({
  code: {
    type: String,
    default: void 0
  },
  display: {
    type: Boolean,
    default: void 0
  },
  designation: {
    type: [ValueSet_Designation],
    default: void 0
  }
});
