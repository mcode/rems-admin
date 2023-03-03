import mongoose from 'mongoose';
import { DataRequirementSort } from 'fhir/r4';
export default new mongoose.Schema<DataRequirementSort>({
  path: {
    type: String,
    default: void 0
  },
  direction: {
    type: String,
    default: void 0
  }
});
