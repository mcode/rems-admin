import { FhirUtilities } from '../fhir/utilities';
import QuestionnaireResponseModel from '../lib/schemas/resources/QuestionnaireResponse';
import { Bundle } from 'fhir/r4';
import { processQuestionnaireResponseSubmission } from '../lib/etasu';

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

module.exports.submit = async (args: any, context: any, logger: any) => {
  logger.info('Running QuestionnaireResponse $submit operation');

  try {
    const requestBody = args?.resource as Bundle;
    return await processQuestionnaireResponseSubmission(requestBody);
  } catch (error) {
    logger.error('Error in QuestionnaireResponse $submit operation:', error);
    throw error;
  }
};
