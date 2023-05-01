import helpers from '../helpers';
import library from '../fixtures/library.json';
import LibraryModel from '../../src/lib/schemas/resources/Library';
describe('Library service', () => {
  helpers.actLikeAService('Library', library, LibraryModel);
});
