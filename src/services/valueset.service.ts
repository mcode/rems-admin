import { FhirUtilities } from '../fhir/utilities';
import ValueSetModel from '../lib/schemas/resources/ValueSet';

module.exports.searchById = async (args: any) => {
  const { id } = args;
  console.log('ValueSet >>> searchById: -- ' + id);
  return await ValueSetModel.findOne({ id: id.toString() }, { _id: 0 }).exec();
};

module.exports.create = async (args: any, req: any) => {
  console.log('ValueSet >>> create');
  const resource = req.req.body;
  const { base_version } = args;
  console.log(resource);
  return await FhirUtilities.store(resource, ValueSetModel, base_version);
};
