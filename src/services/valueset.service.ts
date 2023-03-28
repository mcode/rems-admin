import { FhirUtilities } from '../fhir/utilities';
import ValueSetModel from '../lib/schemas/resources/ValueSet';

module.exports.searchById = (args: any) =>
  new Promise((resolve, reject) => {
    const { id } = args;
    console.log('ValueSet >>> searchById: -- ' + id);
    new Promise((resolve, reject) => {
      const { id } = args;
      console.log('Patient >>> searchById -- ' + id);
      const doc = ValueSetModel.findOne({ id: id.toString() }, { _id: 0 }).exec();
      doc.then(result => {
        if (result) {
          resolve(result);
        } else {
          reject(result);
        }
      });
    });
  });

module.exports.create = (args: any, req: any) =>
  new Promise((resolve, reject) => {
    console.log('ValueSet >>> create');
    const resource = req.req.body;
    const { base_version } = args;
    FhirUtilities.store(resource, ValueSetModel, resolve, reject, base_version);
  });
