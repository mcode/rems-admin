import mongoose from 'mongoose';
import { ValueSetExpansionContains } from 'fhir/r4';
import ValueSet_Designation from './ValueSet_Designation';
const vsContain = new mongoose.Schema<ValueSetExpansionContains>(
  {
    system: {
      type: String,
      default: void 0
    },
    abstract: {
      type: Boolean,
      default: void 0
    },
    inactive: {
      type: Boolean,
      default: void 0
    },
    version: {
      type: String,
      default: void 0
    },
    code: {
      type: String,
      default: void 0
    },
    display: {
      type: String,
      default: void 0
    },
    designation: {
      type: [ValueSet_Designation],
      default: void 0
    }
  },
  { _id: false }
);

vsContain.add({
  contains: {
    type: [vsContain],
    default: void 0
  }
});

export default vsContain;
