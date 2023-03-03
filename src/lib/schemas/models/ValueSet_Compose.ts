import mongoose from 'mongoose';
import { ValueSetCompose } from 'fhir/r4';
import ValueSet_Include from './ValueSet_Include';
export default new mongoose.Schema<ValueSetCompose>({
  lockedDate: {
    type: Date,
    default: void 0
  },
  inactive: {
    type: Boolean,
    default: void 0
  },
  include: {
    type: [ValueSet_Include],
    default: void 0
  },
  exclude: {
    type: [ValueSet_Include],
    default: void 0
  }
});
