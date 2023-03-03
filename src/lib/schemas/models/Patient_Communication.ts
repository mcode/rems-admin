import mongoose from 'mongoose';
import { PatientCommunication } from 'fhir/r4';
export default new mongoose.Schema<PatientCommunication>({
  preferred: {
    type: Boolean,
    default: void 0
  }
});
