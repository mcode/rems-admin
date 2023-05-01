import helpers from '../helpers';
import questionnaireResponse from '../fixtures/questionnaireResponse.json';
import QuestionnaireResponseModel from '../../src/lib/schemas/resources/QuestionnaireResponse';
describe('questionnaireResponse service', () => {
  helpers.actLikeAService(
    'QuestionnaireResponse',
    questionnaireResponse,
    QuestionnaireResponseModel
  );
});
