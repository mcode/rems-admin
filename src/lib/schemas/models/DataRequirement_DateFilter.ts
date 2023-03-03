import mongoose from 'mongoose';
import { DataRequirementDateFilter } from 'fhir/r4';
import Period from './Period';
import Duration from './Duration';
export default new mongoose.Schema<DataRequirementDateFilter>({
  path: {
    type: String,
    default: void 0
  },
  searchParam: {
    type: String,
    default: void 0
  },
  valueDateTime: {
    type: String,
    default: void 0
  },
  valuePeriod: {
    type: Period,
    default: void 0
  },
  valueDuration: {
    type: Duration,
    default: void 0
  }
});
