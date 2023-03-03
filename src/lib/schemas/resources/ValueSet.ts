import mongoose, {
    model
} from 'mongoose';
import {
    ValueSet
} from 'fhir/r4';
import Identifier from '../models/Identifier';
import ContactDetail from '../models/ContactDetail';
import UsageContext from '../models/UsageContext';
import CodeableConcept from '../models/CodeableConcept';
import ValueSet_Compose from '../models/ValueSet_Compose';
import ValueSet_Expansion from '../models/ValueSet_Expansion';

function ValueSetSchema() {
    const ValueSetInterface = {
        id: {
            type: String,
            unique: true,
            index: true
        },
        resourceType: {
            type: String,
            required: true
        },
        url: {
            type: String,
            default: void 0
        },
        identifier: {
            type: [Identifier],
            default: void 0
        },
        version: {
            type: String,
            default: void 0
        },
        name: {
            type: String,
            default: void 0
        },
        title: {
            type: String,
            default: void 0
        },
        status: {
            type: String,
            default: void 0
        },
        experimental: {
            type: Boolean,
            default: void 0
        },
        date: {
            type: Date,
            default: void 0
        },
        publisher: {
            type: String,
            default: void 0
        },
        contact: {
            type: [ContactDetail],
            default: void 0
        },
        description: {
            type: String,
            default: void 0
        },
        useContext: {
            type: [UsageContext],
            default: void 0
        },
        jurisdiction: {
            type: [CodeableConcept],
            default: void 0
        },
        immutable: {
            type: Boolean,
            default: void 0
        },
        purpose: {
            type: String,
            default: void 0
        },
        copyright: {
            type: String,
            default: void 0
        },
        compose: {
            type: ValueSet_Compose,
            default: void 0
        },
        expansion: {
            type: ValueSet_Expansion,
            default: void 0
        }
    };
    return new mongoose.Schema < ValueSet > (ValueSetInterface);
}

const ValueSetModel = model("ValueSet", ValueSetSchema());
export default ValueSetModel