import helpers from '../helpers';
import valueset from '../fixtures/valueSet.json';
import ValueSetModel from '../../src/lib/schemas/resources/ValueSet';
describe('valueset service', () => {
  helpers.actLikeAService('Valueset', valueset, ValueSetModel);
});
