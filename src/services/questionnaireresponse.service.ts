const { resolveSchema } = require('@projecttacoma/node-fhir-server-core');
const moment = require('moment-timezone');

import constants from '../constants'
import { Globals } from '../globals'
import { FhirUtilities } from '../fhir/utilities';


module.exports.searchById = (args: any) =>
  new Promise((resolve, reject) => {
    let { base_version, id } = args;
    console.log('QuestionnaireResponse >>> searchById: -- ' + id);

    let QuestionnaireResponse = FhirUtilities.getQuestionnaireResponse(base_version);

    // Grab an instance of our DB and collection
    let db = Globals.database;
    let collection = db.collection(`${constants.COLLECTION.QUESTIONNAIRERESPONSE}_${base_version}`);
    // Query our collection for this observation
    collection.findOne({ id: id.toString() }, (err: any, questionnaireResponse: any) => {
      if (err) {
        console.log('Error with QuestionnaireResponse.searchById: ', err);
        return reject(err);
      }
      if (questionnaireResponse) {
        resolve(new QuestionnaireResponse(questionnaireResponse));
      }
      resolve("");
    });
  });

module.exports.create = (args: any, req: any ) =>
  new Promise((resolve, reject) => {
    console.log('QuestionnaireResponse >>> create');
    let resource = req.req.body;
    let { base_version } = args;
    FhirUtilities.store(resource, resolve, reject, base_version);
  });
