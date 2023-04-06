import { FhirUtilities } from '../fhir/utilities';
import PatientModel from '../lib/schemas/resources/Patient';

module.exports.searchById = (args: any) =>
  new Promise((resolve, reject) => {
    const { id } = args;
    console.log('Patient >>> searchById -- ' + id);
    const doc = PatientModel.findOne({ id: id.toString() }, { _id: 0 }).exec();
    doc.then(result => {
      if (result) {
        resolve(result);
      } else {
        reject(result);
      }
    });
  });

module.exports.create = (args: any, req: any) =>
  new Promise((resolve, reject) => {
    console.log('Patient >>> create');
    const resource = req.req.body;
    const { base_version } = args;
    FhirUtilities.store(resource, PatientModel, resolve, reject, base_version);
  });
