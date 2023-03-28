import mongoose from 'mongoose';
import { QuestionnaireResponseItem } from 'fhir/r4';
import QuestionnaireResponse_Answer from './QuestionnaireResponse_Answer';
const qrItem = new mongoose.Schema<QuestionnaireResponseItem>(
  {
    linkId: {
      type: String,
      default: void 0
    },
    definition: {
      type: String,
      default: void 0
    },
    answer: {
      type: [QuestionnaireResponse_Answer],
      default: void 0
    }
  },
  { _id: false }
);

qrItem.add({
  item: {
    type: [qrItem],
    default: void 0
  }
});

export default qrItem;
