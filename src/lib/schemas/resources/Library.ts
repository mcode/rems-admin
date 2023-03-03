import mongoose, { model } from 'mongoose';
import { Library } from 'fhir/r4';
import Identifier from '../models/Identifier';
import CodeableConcept from '../models/CodeableConcept';
import Reference from '../models/Reference';
import ContactDetail from '../models/ContactDetail';
import UsageContext from '../models/UsageContext';
import Period from '../models/Period';
import RelatedArtifact from '../models/RelatedArtifact';
import ParameterDefinition from '../models/ParameterDefinition';
import DataRequirement from '../models/DataRequirement';
import Attachment from '../models/Attachment';

function LibrarySchema() {
  const LibraryInterface = {
    id: {
      type: String,
      unique: true,
      index: true
    },
    resourceType: {
      type: String,
      required: true
    },
    url: {
      type: String,
      default: void 0
    },
    identifier: {
      type: [Identifier],
      default: void 0
    },
    version: {
      type: String,
      default: void 0
    },
    name: {
      type: String,
      default: void 0
    },
    title: {
      type: String,
      default: void 0
    },
    subtitle: {
      type: String,
      default: void 0
    },
    status: {
      type: String,
      default: void 0
    },
    experimental: {
      type: Boolean,
      default: void 0
    },
    type: {
      type: CodeableConcept,
      default: void 0
    },
    subjectCodeableConcept: {
      type: CodeableConcept,
      default: void 0
    },
    subjectReference: {
      type: Reference,
      default: void 0
    },
    date: {
      type: Date,
      default: void 0
    },
    publisher: {
      type: String,
      default: void 0
    },
    contact: {
      type: [ContactDetail],
      default: void 0
    },
    description: {
      type: String,
      default: void 0
    },
    useContext: {
      type: [UsageContext],
      default: void 0
    },
    jurisdiction: {
      type: [CodeableConcept],
      default: void 0
    },
    purpose: {
      type: String,
      default: void 0
    },
    usage: {
      type: String,
      default: void 0
    },
    copyright: {
      type: String,
      default: void 0
    },
    approvalDate: {
      type: Date,
      default: void 0
    },
    lastReviewDate: {
      type: Date,
      default: void 0
    },
    effectivePeriod: {
      type: Period,
      default: void 0
    },
    topic: {
      type: [CodeableConcept],
      default: void 0
    },
    author: {
      type: [ContactDetail],
      default: void 0
    },
    editor: {
      type: [ContactDetail],
      default: void 0
    },
    reviewer: {
      type: [ContactDetail],
      default: void 0
    },
    endorser: {
      type: [ContactDetail],
      default: void 0
    },
    relatedArtifact: {
      type: [RelatedArtifact],
      default: void 0
    },
    parameter: {
      type: [ParameterDefinition],
      default: void 0
    },
    dataRequirement: {
      type: [DataRequirement],
      default: void 0
    },
    content: {
      type: [Attachment],
      default: void 0
    }
  };
  return new mongoose.Schema<Library>(LibraryInterface);
}

const LibraryModel = model('Library', LibrarySchema());
export default LibraryModel;
