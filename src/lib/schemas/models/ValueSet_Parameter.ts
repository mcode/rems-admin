import mongoose from 'mongoose';
import {
    ValueSetExpansionParameter
} from 'fhir/r4';
export default new mongoose.Schema<ValueSetExpansionParameter>({
    name: {
        type: String,
        default: void 0
    },
    valueString: {
        type: String,
        default: void 0
    },
    valueBoolean: {
        type: Boolean,
        default: void 0
    },
    valueInteger: {
        type: Number,
        default: void 0
    },
    valueDecimal: {
        type: Number,
        default: void 0
    },
    valueUri: {
        type: String,
        default: void 0
    },
    valueCode: {
        type: String,
        default: void 0
    },
    valueDateTime: {
        type: String,
        default: void 0
    }
});