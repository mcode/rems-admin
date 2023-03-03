import mongoose from 'mongoose';
import {
    ValueSetComposeIncludeFilter,
} from 'fhir/r4';
export default new mongoose.Schema<ValueSetComposeIncludeFilter>({
    property: {
        type: String,
        default: void 0
    },
    op: {
        type: String,
        default: void 0
    },
    value: {
        type: String,
        default: void 0
    }
});
