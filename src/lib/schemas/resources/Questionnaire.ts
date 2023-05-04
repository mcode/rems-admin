import mongoose, { model } from 'mongoose';
import { Questionnaire } from 'fhir/r4';
import Identifier from '../models/Identifier';
import ContactDetail from '../models/ContactDetail';
import UsageContext from '../models/UsageContext';
import CodeableConcept from '../models/CodeableConcept';
import Period from '../models/Period';
import Coding from '../models/Coding';
import Questionnaire_Item from '../models/Questionnaire_Item';
import DomainResource from './DomainResource';
import Library from './Library';
import ValueSet from './ValueSet';

function QuestionnaireSchema() {
  const QuestionnaireInterface = {
    ...DomainResource,
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
    derivedFrom: {
      type: [String],
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
    subjectType: {
      type: [String],
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
    code: {
      type: [Coding],
      default: void 0
    },
    item: {
      type: [Questionnaire_Item],
      default: void 0
    }
  };
  return new mongoose.Schema<Questionnaire>(QuestionnaireInterface, { versionKey: false });
}

const qSchema = QuestionnaireSchema();
qSchema.add({
  contained: {
    type: [qSchema, Library, ValueSet],
    default: void 0
  }
});
const QuestionnaireModel = model<Questionnaire>('Questionnaire', qSchema);
export default QuestionnaireModel;
