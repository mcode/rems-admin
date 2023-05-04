import helpers from '../helpers';
import questionnaire from '../fixtures/questionnaire.json';
import QuestionnaireModel from '../../src/lib/schemas/resources/Questionnaire';
describe('questionnaire service', () => {
  helpers.actLikeAService('Questionnaire', questionnaire, QuestionnaireModel);
});
