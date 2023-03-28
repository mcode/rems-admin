import mongoose from 'mongoose';
import { HumanName } from 'fhir/r4';
import Period from './Period';
export default new mongoose.Schema<HumanName>({
  use: {
    type: String,
    default: void 0
  },
  family: {
    type: String,
    default: void 0
  },
  given: {
    type: [String],
    default: void 0
  },
  prefix: {
    type: [String],
    default: void 0
  },
  suffix: {
    type: [String],
    default: void 0
  },
  period: {
    type: Period,
    default: void 0
  }
}, {_id: false});
