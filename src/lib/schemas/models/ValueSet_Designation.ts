import mongoose from 'mongoose';
import { ValueSetComposeIncludeConceptDesignation } from 'fhir/r4';
import Coding from './Coding';
export default new mongoose.Schema<ValueSetComposeIncludeConceptDesignation>(
  {
    language: {
      type: String,
      default: void 0
    },
    use: {
      type: Coding,
      default: void 0
    },
    value: {
      type: String,
      default: void 0
    }
  },
  { _id: false }
);
