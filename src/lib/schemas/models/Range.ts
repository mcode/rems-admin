import mongoose from 'mongoose';
import { Range } from 'fhir/r4';
import Quantity from './Quantity';
export default new mongoose.Schema<Range>({
  low: {
    type: Quantity,
    default: void 0
  },
  high: {
    type: Quantity,
    default: void 0
  }
});
