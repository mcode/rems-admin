import mongoose from 'mongoose';
import { DataRequirementCodeFilter } from 'fhir/r4';
import canonical from './canonical';
import Coding from './Coding';
export default new mongoose.Schema<DataRequirementCodeFilter>({
  path: {
    type: String,
    default: void 0
  },
  searchParam: {
    type: String,
    default: void 0
  },
  valueSet: {
    type: String,
    default: void 0
  },
  code: {
    type: [Coding],
    default: void 0
  }
}, {_id: false});
