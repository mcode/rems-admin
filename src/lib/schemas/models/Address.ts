import mongoose from 'mongoose';
import { Address } from 'fhir/r4';
import Period from './Period';
export default new mongoose.Schema<Address>({
  use: {
    type: String,
    default: void 0
  },
  type: {
    type: String,
    default: void 0
  },
  line: {
    type: [String],
    default: void 0
  },
  city: {
    type: String,
    default: void 0
  },
  district: {
    type: String,
    default: void 0
  },
  state: {
    type: String,
    default: void 0
  },
  postalCode: {
    type: String,
    default: void 0
  },
  country: {
    type: String,
    default: void 0
  },
  period: {
    type: Period,
    default: void 0
  }
});
