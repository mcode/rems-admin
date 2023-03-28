import mongoose, { model } from 'mongoose';
import { Patient } from 'fhir/r4';
import Identifier from '../models/Identifier';
import HumanName from '../models/HumanName';
import ContactPoint from '../models/ContactPoint';
import Address from '../models/Address';
import CodeableConcept from '../models/CodeableConcept';
import Attachment from '../models/Attachment';
import Patient_Contact from '../models/Patient_Contact';
import Patient_Communication from '../models/Patient_Communication';
import Reference from '../models/Reference';
import Patient_Link from '../models/Patient_Link';
function PatientSchema() {
  const PatientInterface = {
    id: {
      type: String,
      unique: true,
      index: true
    },
    resourceType: {
      type: String,
      required: true
    },
    identifier: [
      {
        type: Identifier,
        default: void 0
      }
    ],
    active: {
      type: Boolean,
      default: void 0
    },
    name: {
      type: [HumanName],
      default: void 0
    },
    telecom: {
      type: [ContactPoint],
      default: void 0
    },
    gender: {
      type: String,
      default: void 0
    },
    birthDate: {
      type: Date,
      default: void 0
    },
    deceasedBoolean: {
      type: Boolean,
      default: void 0
    },
    deceasedDateTime: {
      type: String,
      default: void 0
    },
    address: {
      type: [Address],
      default: void 0
    },
    maritalStatus: {
      type: CodeableConcept,
      default: void 0
    },
    multipleBirthBoolean: {
      type: Boolean,
      default: void 0
    },
    multipleBirthInteger: {
      type: Number,
      default: void 0
    },
    photo: {
      type: [Attachment],
      default: void 0
    },
    contact: {
      type: [Patient_Contact],
      default: void 0
    },
    communication: {
      type: [Patient_Communication],
      default: void 0
    },
    generalPractitioner: {
      type: [Reference],
      default: void 0
    },
    managingOrganization: {
      type: Reference,
      default: void 0
    },
    link: {
      type: [Patient_Link],
      default: void 0
    }
  };
  return new mongoose.Schema<Patient>(PatientInterface, { versionKey: false });
}

const PatientModel = model<Patient>('Patient', PatientSchema());
export default PatientModel;
