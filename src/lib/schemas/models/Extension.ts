import mongoose from 'mongoose';
import { Extension } from 'fhir/r4';
import Expression from './Expression';
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
    }
  },
  { _id: false }
);
