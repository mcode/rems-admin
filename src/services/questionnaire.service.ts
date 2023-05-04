import { FhirUtilities } from '../fhir/utilities';
import { QuestionnaireUtilities } from '../fhir/questionnaireUtilities';
import QuestionnaireModel from '../lib/schemas/resources/Questionnaire';

module.exports.searchById = async (args: any) => {
  const { id } = args;
  console.log('Questionnaire >>> searchById: -- ' + id);
  return await QuestionnaireModel.findOne({ id: id.toString() }, { _id: 0 }).exec();
};

module.exports.create = async (args: any, req: any) => {
  console.log('Questionnaire >>> create');
  const resource = req.req.body;
  const { base_version } = args;
  return await FhirUtilities.store(resource, QuestionnaireModel, base_version);
};

module.exports.questionnairePackage = async (args: any, context: any, logger: any) => {
  logger.info('Running Questionnaire Package /:id/$questionnaire-package');
  const { id } = args;
  const result = await QuestionnaireModel.findOne({ id: id.toString() }, { _id: 0 }).exec();
  if (result) {
    const parameters = await QuestionnaireUtilities.createPackageFromQuestionnaire(result);
    return parameters;
  } else {
    throw result;
  }
};

// module.exports.questionnairePackage = (args: any, context: any, logger: any) => {
//   logger.info('Running Questionnaire Package /:id/$questionnaire-package');
//   return new Promise((resolve, reject) => {
//     const { id } = args;
//     const doc = QuestionnaireModel.findOne({ id: id.toString() }, { _id: 0 }).exec();
//     doc.then(async result => {
//       if (result) {
//         const unprocessedQ: Questionnaire = result.toObject();
//         const parameters = await QuestionnaireUtilities.createPackageFromQuestionnaire(
//           unprocessedQ
//         );
//         resolve(parameters);
//       } else {
//         reject(result);
//       }
//     });
//   });
// };
