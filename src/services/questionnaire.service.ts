const { resolveSchema } = require('@projecttacoma/node-fhir-server-core');
const moment = require('moment-timezone');

import constants from '../constants'
import { Globals } from '../globals'
import { FhirUtilities } from '../fhir/utilities';


module.exports.searchById = (args: any) =>
  new Promise((resolve, reject) => {
    let { base_version, id } = args;
    console.log('Questionnaire >>> searchById: -- ' + id);

    let Questionnaire = FhirUtilities.getQuestionnaire(base_version);

    // Grab an instance of our DB and collection
    let db = Globals.database;
    let collection = db.collection(`${constants.COLLECTION.QUESTIONNAIRE}_${base_version}`);
    // Query our collection for this observation
    collection.findOne({ id: id.toString() }, (err: any, questionnaire: any) => {
      if (err) {
        console.log('Error with Questionnaire.searchById: ', err);
        return reject(err);
      }
      if (questionnaire) {
        resolve(new Questionnaire(questionnaire));
      }
      resolve("");
    });
  });

module.exports.create = (args: any, req: any ) =>
  new Promise((resolve, reject) => {
    console.log('Questionnaire >>> create');
    let resource = req.req.body;
    let { base_version } = args;
    FhirUtilities.store(resource, resolve, reject, base_version);
  });
