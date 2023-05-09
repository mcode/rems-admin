import { FhirUtilities } from '../fhir/utilities';
import PatientModel from '../lib/schemas/resources/Patient';

module.exports.searchById = async (args: any) => {
  const { id } = args;
  console.log('Patient >>> searchById -- ' + id);
  return await PatientModel.findOne({ id: id.toString() }, { _id: 0 }).exec();
};

module.exports.create = async (args: any, req: any) => {
  console.log('Patient >>> create');
  const resource = req.req.body;
  const { base_version } = args;
  return await FhirUtilities.store(resource, PatientModel, base_version);
};
