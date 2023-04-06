import { FhirUtilities } from '../fhir/utilities';
import LibraryModel from '../lib/schemas/resources/Library';

module.exports.searchById = async (args: any) => {
  const { id } = args;
  console.log('Library >>> searchById: -- ' + id);
  return await LibraryModel.findOne({ id: id.toString() }, { _id: 0 }).exec();
};

module.exports.create = async (args: any, req: any) => {
  console.log('Library >>> create');
  const resource = req.req.body;
  const { base_version } = args;
  return await FhirUtilities.store(resource, LibraryModel, base_version);
};
