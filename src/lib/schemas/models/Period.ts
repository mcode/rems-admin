import mongoose from 'mongoose';
import { Period } from 'fhir/r4';
export default new mongoose.Schema<Period>({
  start: {
    type: Date,
    default: void 0
  },
  end: {
    type: Date,
    default: void 0
  }
}, {_id: false});
