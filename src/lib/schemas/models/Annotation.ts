import mongoose from 'mongoose';
import { Annotation } from 'fhir/r4';
import Reference from '../models/Reference';
export default new mongoose.Schema<Annotation>(
  {
    authorReference: {
      type: Reference,
      default: void 0
    },
    time: {
      type: Date,
      default: void 0
    },
    text: {
      type: String,
      default: void 0
    }
  },
  { _id: false }
);
