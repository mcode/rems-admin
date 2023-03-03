import mongoose from 'mongoose';
import { PatientContact } from 'fhir/r4';
import CodeableConcept from './CodeableConcept';
import HumanName from './HumanName';
import ContactPoint from './ContactPoint';
import Address from './Address';
import Reference from './Reference';
import Period from './Period';
export default new mongoose.Schema<PatientContact>({
  relationship: {
    type: [CodeableConcept],
    default: void 0
  },
  name: {
    type: HumanName,
    default: void 0
  },
  telecom: {
    type: [ContactPoint],
    default: void 0
  },
  address: {
    type: Address,
    default: void 0
  },
  gender: {
    type: String,
    default: void 0
  },
  organization: {
    type: Reference,
    default: void 0
  },
  period: {
    type: Period,
    default: void 0
  }
});
