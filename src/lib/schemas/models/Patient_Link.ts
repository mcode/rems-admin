import mongoose from 'mongoose';
import { PatientLink } from 'fhir/r4';
import Reference from './Reference';
export default new mongoose.Schema<PatientLink>({
  other: {
    type: Reference,
    default: void 0
  },
  type: {
    type: String,
    default: void 0
  }
}, {_id: false});
