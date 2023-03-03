import mongoose from 'mongoose';
import {
    Coding
} from 'fhir/r4';
export default new mongoose.Schema<Coding>({
    system: {
        type: String,
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
    userSelected: {
        type: Boolean,
        default: void 0
    }
});