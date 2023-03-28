import mongoose, { Schema, Model } from 'mongoose';
import { Reference } from 'fhir/r4';
const idF = new mongoose.Schema<Reference>({
  reference: {
    type: String,
    default: void 0
  },
  type: {
    type: String,
    default: void 0
  },
  display: {
    type: String,
    default: void 0
  },
  identifier: [{ type: Schema.Types.ObjectId, ref: 'Identifier' }]
}, {_id: false});
mongoose.model('Reference', idF);
export default idF;
