import mongoose from 'mongoose';
import { ParameterDefinition } from 'fhir/r4';
import integer from './integer';
import canonical from './canonical';
export default new mongoose.Schema<ParameterDefinition>(
  {
    name: {
      type: String,
      default: void 0
    },
    use: {
      type: String,
      default: void 0
    },
    min: {
      type: integer,
      default: void 0
    },
    max: {
      type: String,
      default: void 0
    },
    documentation: {
      type: String,
      default: void 0
    },
    type: {
      type: String,
      default: void 0
    },
    profile: {
      type: String,
      default: void 0
    }
  },
  { _id: false }
);
