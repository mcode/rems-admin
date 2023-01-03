import constants from '../constants';
import { Globals } from '../globals';
import { FhirUtilities } from '../fhir/utilities';


module.exports.searchById = (args: any) =>
  new Promise((resolve, reject) => {
    const { base_version, id } = args;
    console.log('ValueSet >>> searchById: -- ' + id);

    const ValueSet = FhirUtilities.getValueSet(base_version);

    // Grab an instance of our DB and collection
    const db = Globals.database;
    const collection = db.collection(`${constants.COLLECTION.VALUESET}_${base_version}`);
    // Query our collection for this observation
    collection.findOne({ id: id.toString() }, (err: any, valueSet: any) => {
      if (err) {
        console.log('Error with ValueSet.searchById: ', err);
        return reject(err);
      }
      if (valueSet) {
        resolve(new ValueSet(valueSet));
      }
      resolve('');
    });
  });

module.exports.create = (args: any, req: any ) =>
  new Promise((resolve, reject) => {
    console.log('ValuSet >>> create');
    const resource = req.req.body;
    const { base_version } = args;
    FhirUtilities.store(resource, resolve, reject, base_version);
  });
