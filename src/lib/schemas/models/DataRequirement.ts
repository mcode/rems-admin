import mongoose from 'mongoose';
import {
    DataRequirement
} from 'fhir/r4';
import canonical from './canonical';
import CodeableConcept from './CodeableConcept';
import Reference from './Reference';
import DataRequirement_CodeFilter from './DataRequirement_CodeFilter';
import DataRequirement_DateFilter from './DataRequirement_DateFilter';
import DataRequirement_Sort from './DataRequirement_Sort';
export default new mongoose.Schema<DataRequirement>({
    type: {
        type: String,
        default: void 0
    },
    profile: {
        type: [canonical],
        default: void 0
    },
    subjectCodeableConcept: {
        type: CodeableConcept,
        default: void 0
    },
    subjectReference: {
        type: Reference,
        default: void 0
    },
    mustSupport: {
        type: [String],
        default: void 0
    },
    codeFilter: {
        type: [DataRequirement_CodeFilter],
        default: void 0
    },
    dateFilter: {
        type: [DataRequirement_DateFilter],
        default: void 0
    },
    limit: {
        type: Number,
        default: void 0
    },
    sort: {
        type: [DataRequirement_Sort],
        default: void 0
    }
});