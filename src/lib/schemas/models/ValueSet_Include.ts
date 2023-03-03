import mongoose from 'mongoose';
import {
    ValueSetComposeInclude
} from 'fhir/r4';
import ValueSet_Concept from './ValueSet_Concept';
import ValueSet_Filter from './ValueSet_Filter';
import canonical from './canonical';
export default new mongoose.Schema<ValueSetComposeInclude>({
    system: {
        type: String,
        default: void 0
    },
    version: {
        type: String,
        default: void 0
    },
    concept: {
        type: [ValueSet_Concept],
        default: void 0
    },
    filter: {
        type: [ValueSet_Filter],
        default: void 0
    },
    valueSet: {
        type: [canonical],
        default: void 0
    }
});