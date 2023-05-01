import { FhirUtilities } from '../fhir/utilities';
import QuestionnaireResponseModel from '../lib/schemas/resources/QuestionnaireResponse';

module.exports.searchById = async (args: any) => {
  const { id } = args;
  console.log('Patient >>> searchById -- ' + id);
  return await QuestionnaireResponseModel.findOne({ id: id.toString() }, { _id: 0 }).exec();
};

module.exports.create = async (args: any, req: any) => {
  console.log('QuestionnaireResponse >>> create');
  const resource = req.req.body;
  const { base_version } = args;
  return await FhirUtilities.store(resource, QuestionnaireResponseModel, base_version);
};
