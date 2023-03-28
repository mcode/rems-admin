import constants from '../constants';
import { Globals } from '../globals';
import { FhirUtilities } from '../fhir/utilities';
import { Questionnaire } from 'fhir/r4';
import { QuestionnaireUtilities } from '../fhir/questionnaireUtilities';
import QuestionnaireModel from '../lib/schemas/resources/Questionnaire';

module.exports.searchById = (args: any) => {
  return new Promise((resolve, reject) => {
    const { id } = args;
    console.log('Questionnaire >>> searchById: -- ' + id);
    const doc = QuestionnaireModel.findOne({ id: id.toString() }, { _id: 0 }).exec();
    doc.then(result => {
      console.log(result);
      if (result) {
        resolve(result);
      } else {
        reject(result);
      }
    });
  });
};

module.exports.create = (args: any, req: any) =>
  new Promise((resolve, reject) => {
    console.log('Questionnaire >>> create');
    const resource = req.req.body;
    const { base_version } = args;
    FhirUtilities.store(resource, QuestionnaireModel, resolve, reject, base_version);
  });

module.exports.questionnairePackage = (args: any, context: any, logger: any) => {
  logger.info('Running Questionnaire Package /:id/$questionnaire-package');
  return new Promise((resolve, reject) => {
    const { id } = args;
    const doc = QuestionnaireModel.findOne({ id: id.toString() }, { _id: 0 }).exec();
    doc.then(async result => {
      if (result) {
        const unprocessedQ: Questionnaire = result.toObject();
        const parameters = await QuestionnaireUtilities.createPackageFromQuestionnaire(
          unprocessedQ
        );
        resolve(parameters);
      } else {
        reject(result);
      }
    });
  });
};
