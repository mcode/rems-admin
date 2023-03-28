import mongoose from 'mongoose';
import { ContactDetail } from 'fhir/r4';
import ContactPoint from './ContactPoint';
export default new mongoose.Schema<ContactDetail>({
  name: {
    type: String,
    default: void 0
  },
  telecom: {
    type: [ContactPoint],
    default: void 0
  }
}, {_id: false});
