import helpers from '../helpers';
import patient from '../fixtures/patient.json';
import PatientModel from '../../src/lib/schemas/resources/Patient';
describe('Patient service', () => {
  helpers.actLikeAService('Patient', patient, PatientModel);
});
