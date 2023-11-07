import mongoose from 'mongoose';
import { ValueSetExpansion } from 'fhir/r4';
import ValueSet_Parameter from './ValueSet_Parameter';
import ValueSet_Contains from './ValueSet_Contains';
export default new mongoose.Schema<ValueSetExpansion>(
  {
    identifier: {
      type: String,
      default: void 0
    },
    timestamp: {
      type: String,
      default: void 0
    },
    total: {
      type: Number,
      default: void 0
    },
    offset: {
      type: Number,
      default: void 0
    },
    parameter: {
      type: [ValueSet_Parameter],
      default: void 0
    },
    contains: {
      type: [ValueSet_Contains],
      default: void 0
    }
  },
  { _id: false }
);
