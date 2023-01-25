import constants from '../constants';
import { Globals } from '../globals';
import { FhirUtilities } from '../fhir/utilities';
import { Questionnaire } from 'fhir/r4';
import { QuestionnaireUtilities } from '../fhir/questionnaireUtilities';

module.exports.searchById = (args: any) =>
  new Promise((resolve, reject) => {
    const { base_version, id } = args;
    console.log('Questionnaire >>> searchById: -- ' + id);

    const Questionnaire = FhirUtilities.getQuestionnaire(base_version);
    // Grab an instance of our DB and collection
    const db = Globals.database;
    const collection = db.collection(`${constants.COLLECTION.QUESTIONNAIRE}_${base_version}`);
    // Query our collection for this observation
    collection.findOne({ id: id.toString() }, (err: any, questionnaire: Questionnaire) => {
      if (err) {
        console.log('Error with Questionnaire.searchById: ', err);
        return reject(err);
      }
      if (questionnaire) {
        resolve(new Questionnaire(questionnaire));
      }
      resolve('');
    });
  });

module.exports.create = (args: any, req: any) =>
  new Promise((resolve, reject) => {
    console.log('Questionnaire >>> create');
    const resource = req.req.body;
    const { base_version } = args;
    FhirUtilities.store(resource, resolve, reject, base_version);
  });

module.exports.questionnairePackage = (args: any, context: any, logger: any) => {
  logger.info('Running Questionnaire Package /:id/$questionnaire-package');
  return new Promise((resolve, reject) => {
    const { base_version, id } = args;
    const Questionnaire = FhirUtilities.getQuestionnaire(base_version);
    const db = Globals.database;
    const collection = db.collection(`${constants.COLLECTION.QUESTIONNAIRE}_${base_version}`);
    collection.findOne({ id: id.toString() }, async (err: any, questionnaire: Questionnaire) => {
      if (err) {
        console.log('Error finding Questionnaire: ', err);
        return reject(err);
      }
      if (questionnaire) {
        const unprocessedQ = new Questionnaire(questionnaire);
        const parameters = QuestionnaireUtilities.createPackageFromQuestionnaire(unprocessedQ);
        resolve(parameters);
      }
      resolve('');
    });
  });
};
