import mongoose from 'mongoose';
import { Duration } from 'fhir/r4';
export default new mongoose.Schema<Duration>({
  value: {
    type: Number,
    default: void 0
  },
  comparator: {
    type: String,
    default: void 0
  },
  unit: {
    type: String,
    default: void 0
  },
  system: {
    type: String,
    default: void 0
  },
  code: {
    type: String,
    default: void 0
  }
});
