import mongoose from 'mongoose';
import { Expression } from 'fhir/r4';
export default new mongoose.Schema<Expression>({
  name: {
    type: String,
    default: void 0
  },
  language: {
    type: String,
    default: void 0
  },
  expression: {
    type: String,
    default: void 0
  },
}, {_id: false});
