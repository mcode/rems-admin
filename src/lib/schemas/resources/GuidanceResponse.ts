import mongoose, { model } from 'mongoose';
import { GuidanceResponse } from 'fhir/r4';
import Identifier from '../models/Identifier';
import Reference from '../models/Reference';
import CodeableConcept from '../models/CodeableConcept';
import DomainResource from './DomainResource';
import Library from './Library';
import ValueSet from './ValueSet';
import Annotation from '../models/Annotation';
import DataRequirement from '../models/DataRequirement';

function GuidanceResponseSchema() {
  const GuidanceResponseInterface = {
    ...DomainResource,
    requestIdentifier: {
      type: Identifier,
      default: void 0
    },
    identifier: {
      type: [Identifier],
      default: void 0
    },
    moduleUri: {
      type: String,
      default: void 0
    },
    status: {
      type: String,
      default: void 0
    },
    subject: {
      type: Reference,
      default: void 0
    },
    encounter: {
      type: Reference,
      default: void 0
    },
    occurenceDateTime: {
      type: Date,
      default: void 0
    },
    performer: {
      type: Reference,
      default: void 0
    },
    reasonCode: {
      type: [CodeableConcept],
      default: void 0
    },
    reasonReference: {
      type: [Reference],
      default: void 0
    },
    note: {
      type: [Annotation],
      default: void 0
    },
    evaluationMessage: {
      type: [Reference],
      default: void 0
    },
    outputParameters: {
      type: Reference,
      default: void 0
    },
    result: {
      type: Reference,
      default: void 0
    },
    dataRequirement: {
      type: [DataRequirement],
      default: void 0
    }
  };
  return new mongoose.Schema<GuidanceResponse>(GuidanceResponseInterface, { versionKey: false });
}

const qSchema = GuidanceResponseSchema();
qSchema.add({
  contained: {
    type: [qSchema, Library, ValueSet],
    default: void 0
  }
});
const GuidanceResponseModel = model<GuidanceResponse>('GuidanceResponse', qSchema);
export default GuidanceResponseModel;
