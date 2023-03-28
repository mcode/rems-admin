import constants from '../constants';
import { Globals } from '../globals';
import { FhirUtilities } from '../fhir/utilities';
import LibraryModel from '../lib/schemas/resources/Library';

module.exports.searchById = (args: any) =>
  new Promise((resolve, reject) => {
    const { id } = args;
    console.log('Library >>> searchById: -- ' + id);
    const doc = LibraryModel.findOne({ id: id.toString() }, { _id: 0 }).exec();
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
    console.log('Library >>> create');
    const resource = req.req.body;
    const { base_version } = args;
    FhirUtilities.store(resource, LibraryModel, resolve, reject, base_version);
  });
