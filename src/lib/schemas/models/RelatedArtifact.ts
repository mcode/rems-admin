import mongoose from 'mongoose';
import {
    RelatedArtifact
} from 'fhir/r4';
import Attachment from './Attachment';
import canonical from './canonical';
export default new mongoose.Schema<RelatedArtifact>({
    type: {
        type: String,
        default: void 0
    },
    label: {
        type: String,
        default: void 0
    },
    display: {
        type: String,
        default: void 0
    },
    citation: {
        type: String,
        default: void 0
    },
    url: {
        type: String,
        default: void 0
    },
    document: {
        type: Attachment,
        default: void 0
    },
    resource: {
        type: canonical,
        default: void 0
    }
});