import mongoose from 'mongoose';
import { ContactPoint } from 'fhir/r4';
import Period from './Period';
export default new mongoose.Schema<ContactPoint>(
  {
    system: {
      type: String,
      default: void 0
    },
    value: {
      type: String,
      default: void 0
    },
    use: {
      type: String,
      default: void 0
    },
    rank: {
      type: Number,
      default: void 0
    },
    period: {
      type: Period,
      default: void 0
    }
  },
  { _id: false }
);
