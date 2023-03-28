import mongoose from 'mongoose';
import { Attachment } from 'fhir/r4';
export default new mongoose.Schema<Attachment>(
  {
    contentType: {
      type: String,
      default: void 0
    },
    data: {
      type: String,
      default: void 0
    },
    url: {
      type: String,
      default: void 0
    },
    size: {
      type: Number,
      default: void 0
    },
    hash: {
      type: Buffer,
      default: void 0
    },
    title: {
      type: String,
      default: void 0
    },
    creation: {
      type: Date,
      default: void 0
    }
  },
  { _id: false }
);
