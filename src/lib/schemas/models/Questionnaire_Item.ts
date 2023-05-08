import mongoose from 'mongoose';
import { QuestionnaireItem } from 'fhir/r4';
import Coding from './Coding';
import Questionnaire_EnableWhen from './Questionnaire_EnableWhen';
import Questionnaire_AnswerOption from './Questionnaire_AnswerOption';
import Questionnaire_Initial from './Questionnaire_Initial';
import Extension from './Extension';
const qItem = new mongoose.Schema<QuestionnaireItem>(
  {
    linkId: {
      type: String,
      default: void 0
    },
    extension: {
      type: [Extension],
      default: void 0
    },
    definition: {
      type: String,
      default: void 0
    },
    code: {
      type: [Coding],
      default: void 0
    },
    prefix: {
      type: String,
      default: void 0
    },
    text: {
      type: String,
      default: void 0
    },
    type: {
      type: String,
      default: void 0
    },
    enableWhen: {
      type: [Questionnaire_EnableWhen],
      default: void 0
    },
    enableBehavior: {
      type: String,
      default: void 0
    },
    required: {
      type: Boolean,
      default: void 0
    },
    repeats: {
      type: Boolean,
      default: void 0
    },
    readOnly: {
      type: Boolean,
      default: void 0
    },
    maxLength: {
      type: mongoose.Types.Decimal128,
      default: void 0
    },
    answerValueSet: {
      type: String,
      default: void 0
    },
    answerOption: {
      type: [Questionnaire_AnswerOption],
      default: void 0
    },
    initial: {
      type: [Questionnaire_Initial],
      default: void 0
    }
  },
  { _id: false }
);

qItem.add({
  item: {
    type: [qItem],
    default: void 0
  }
});

export default qItem;
