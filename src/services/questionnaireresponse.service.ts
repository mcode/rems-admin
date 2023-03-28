import { FhirUtilities } from '../fhir/utilities';
import QuestionnaireResponseModel from '../lib/schemas/resources/QuestionnaireResponse';

module.exports.searchById = (args: any) =>
  new Promise((resolve, reject) => {
    const { id } = args;
    console.log('QuestionnaireResponse >>> searchById: -- ' + id);
    new Promise((resolve, reject) => {
      const { id } = args;
      console.log('Patient >>> searchById -- ' + id);
      const doc = QuestionnaireResponseModel.findOne({id: id.toString()}, {_id: 0}).exec();
      doc.then((result) => {
        if(result){
          resolve(result);
        } else{
          reject(result);
        }
      });
    });
  });

module.exports.create = (args: any, req: any) =>
  new Promise((resolve, reject) => {
    console.log('QuestionnaireResponse >>> create');
    const resource = req.req.body;
    const { base_version } = args;
    FhirUtilities.store(resource, QuestionnaireResponseModel, resolve, reject, base_version);
  });
