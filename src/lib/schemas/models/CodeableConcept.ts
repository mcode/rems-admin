import mongoose from 'mongoose';
import { CodeableConcept } from 'fhir/r4';
import Coding from './Coding';
export default new mongoose.Schema<CodeableConcept>({
  coding: {
    type: [Coding],
    default: void 0
  }
}, {_id: false});
