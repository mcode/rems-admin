import cors from 'cors';
import bodyParser from 'body-parser';
import container from './lib/winston';
import morgan from 'morgan';
import Hook from './hooks/Hook';
import remsService from './hooks/rems.hook';
import { Server } from '@projecttacoma/node-fhir-server-core';
import { Globals } from './globals';
import { uid } from 'uid';
import { FhirUtilities } from './fhir/utilities';




const logger = container.get('application');

const initialize = (config: any) => {
  //const logLevel = _.get(config, 'logging.level');
  return new REMSServer(config.fhirServerConfig)
    .configureMiddleware()
    .configureSession()
    .configureHelmet()
    .configurePassport()
    .setPublicDirectory()
    .setProfileRoutes()
    .registerCdsHooks(config.server)
    .configureEtasuEndpoints()
    .setErrorRoutes();

};

/**
 * @name exports
 * @static
 * @summary Main Server for the application
 * @class Server
 */
class REMSServer extends Server {
  services: Hook[];
  /**
   * @method constructor
   * @description Setup defaults for the server instance
   */

  constructor(config: any) {
    super(config);
    this.services = [];
    return this;
  }

  /**
   * @method configureMiddleware
   * @description Enable all the standard middleware
   */
  configureMiddleware() {
    super.configureMiddleware();
    this.app.set('showStackError', true);
    this.app.set('jsonp callback', true);
    this.app.use(bodyParser.urlencoded({ limit: '50mb', extended: true }));
    this.app.use(bodyParser.json({ limit: '50mb' }));

    this.app.use(cors());
    this.app.options('*', cors());

    return this;
  }

  /**
   * @method configureLogstream
   * @description Enable streaming logs via morgan
   */
  configureLogstream({ log, level = 'info' }: { log?: any; level?: string } = {}) {
    super.configureLogstream;
    this.app.use(
      log
        ? log
        : morgan('combined', {
          stream: { write: message => logger.log(level, message) }
        })
    );

    return this;
  }

  registerService({ definition, handler }: { definition: any; handler: any }) {
    this.services.push(definition);
    this.app.post(`${this.cdsHooksEndpoint}/${definition.id}`, handler);

    //TODO: remove this after request generator is updated to a new order-sign prefetch
    // add a post endpoint to match the old CRD server
    this.app.post(`/r4${this.cdsHooksEndpoint}/${definition.hook}-crd`, handler);

    return this;
  }

  registerCdsHooks({ discoveryEndpoint = '/cds-services' }: any) {
    this.cdsHooksEndpoint = discoveryEndpoint;
    this.registerService(remsService);

    this.app.get(discoveryEndpoint, (req: any, res: { json: (arg0: { services: any }) => any }) =>
      res.json({ services: this.services })
    );
    this.app.get('/', (req: any, res: { send: (arg0: string) => any }) =>
      res.send('Welcome to the REMS Administrator')
    );
    return this;
  }

  configureEtasuEndpoints() {
    const db = Globals.database;

    const medicationCollection = db.collection("medication-requirements");
    const metRequirementsCollection = db.collection("met-requirements");
    const remsCaseCollection = db.collection("rems-case");

    // etasu endpoints 
    this.app.get('/etasu/:drug', (req: any, res: { send: (arg0: string) => any }) => {
      medicationCollection.findOne({ "name": req.params.drug }, (err: any, drug: any) => {
        if (err) throw err;
        res.send(drug);
      });
    }
    );

    this.app.get('/etasu/met/:caseId', (req: any, res: { send: (arg0: string) => any }) => {
      remsCaseCollection.findOne({ "case_number": req.params.caseId }, (err: any, remsCase: any) => {
        if (err) throw err;
        res.send(remsCase);
      });
    }
    );

    this.app.get('/etasu/met/patient/:patientName/drug/:drugName', (req: any, res: { send: (arg0: string) => any }) => {
      remsCaseCollection.findOne({ patientName : req.params.patientName, drugName: req.params.drugName}, (err: any, remsCase: any) => {
        if (err) throw err;
        res.send(remsCase);
      });
    }
    );

    this.app.post('/etasu/reset', (req: any, res: { send: (arg0: string) => any }) => {
      console.log("Dropping collections");
      medicationCollection.drop();
      remsCaseCollection.drop();
      metRequirementsCollection.drop();
      console.log("Resetting the database");
      FhirUtilities.populateDB();
      res.send("reset etasu database collections");
    }
    );

    this.app.post('/etasu/met', async (req: any, res: { send: (arg0: string) => any }) => {
      let returnedRemsRequestDoc: any;
      let returnedMetReqDoc: any;
      let returnRemsRequest = false;
      const requestBody = req.body;

      // extract params and questionnaire response identifier
      let params = this.getResource(requestBody, requestBody.entry[0].resource.focus.parameters.reference);
      let questionnaireResponse = this.getQuestionnaireResponse(requestBody);
      let questionnaireStringArray = questionnaireResponse.questionnaire.split("/");
      let requirementId = questionnaireStringArray[questionnaireStringArray.length - 1];

      // stakeholder and medication references
      let prescriptionReference = "";
      let practitionerReference = "";
      let pharmacistReference = "";
      let patientReference = "";
      for (let param of params.parameter) {
        if (param.name === "prescription") {
          prescriptionReference = param.reference;
        }
        else if (param.name === "prescriber") {
          practitionerReference = param.reference;
        }
        else if (param.name === "pharmacy") {
          pharmacistReference = param.reference;
        } else if (param.name === "source-patient") {
          patientReference = param.reference;
        }
      }

      // obtain drug information from database
      let presciption = this.getResource(requestBody, prescriptionReference);
      let prescriptionSystem = presciption.medicationCodeableConcept.coding[0].system;
      let prescriptionCode = presciption.medicationCodeableConcept.coding[0].code;
      let patient = this.getResource(requestBody, patientReference);
      let patientName = patient.name[0].given[0] + ' ' + patient.name[0].family;
  
      const drug = await medicationCollection.findOne({ code: prescriptionCode, codeSystem: prescriptionSystem }
      //   , (err: any, result: any) => {
      //   if (err) console.log(err);
      //   console.log('Found Drug Info: ');
      //   console.log(result)
      //   return result;
      // }
      );
      // iterate through each requirement of the drug
      for (let requirement of drug.requirements) {
        // figure out which stakeholder the req corresponds to 
        let reqStakeholder = requirement.stakeholderType;
        let reqStakeholderReference = reqStakeholder === "prescriber" ? practitionerReference : (reqStakeholder === "pharmacist" ? pharmacistReference : patientReference);

        // if the requirement is the one submitted continue
        if (requirement.resourceId === requirementId) {

          // if the req submitted is a patient enrollment form and requires creating a new case
          if (requirement.createNewCase) {
            returnRemsRequest = true;
            const case_number = uid();

            // create new rems request and add the created metReq to it
            let remsRequestCompletedStatus = "Approved";
            let remsRequest: any = {
              case_number: case_number,
              status : remsRequestCompletedStatus,
              drugName: drug.name,
              patientName: patientName,
              metRequirements : [],
           };
            returnRemsRequest = true;

            // create the metReq that was submitted
            let metReq = {
              completed: true,
              completedQuestionnaire: questionnaireResponse,
              requirementName: requirement.name,
              requirementDescription: requirement.description,
              drugName: drug.name,
              stakeholderId: reqStakeholderReference,
              case_numbers: [case_number],
            };

            await metRequirementsCollection.insertOne(metReq
            //   , (err: any, result: any) => {
            //   if (err) console.log(err);
            //   console.log('Inserted Matched Met Requirement');
            // }
            );

            const matchedMetReq = await metRequirementsCollection.findOne(metReq);

            
            remsRequest.metRequirements.push(
              {
                stakeholderId : matchedMetReq.stakeholderId,
                completed : matchedMetReq.completed,
                metRequirementId: matchedMetReq._id,
                requirementName: matchedMetReq.requirementName,
                requirementDescription: matchedMetReq.requirementDescription,
              }
            );
       
            // iterate through all other reqs again to create corresponding false metReqs / assign to existing 
            for (let requirement2 of drug.requirements) {
              // skip if the req found is the same as in the outer loop and has already been processed
              if (!(requirement2.resourceId === requirementId)) {
                // figure out which stakeholder the req corresponds to 
                let reqStakeholder2 = requirement2.stakeholderType;
                let reqStakeholder2Reference = reqStakeholder2 === "prescriber" ? practitionerReference : (reqStakeholder2 === "pharmacist" ? pharmacistReference : patientReference);
                
                const matchedMetReq2 = await metRequirementsCollection.findOne({stakeholderId: reqStakeholder2Reference, requirementName: requirement2.name, drugName: drug.name});
                if (matchedMetReq2) {
                  remsRequest.metRequirements.push(
                    {
                      stakeholderId : matchedMetReq2.stakeholderId,
                      completed : matchedMetReq2.completed,
                      metRequirementId: matchedMetReq2._id,
                      requirementName: matchedMetReq2.requirementName,
                      requirementDescription: matchedMetReq2.requirementDescription,
                    }
                  );
                  if(!matchedMetReq2.completed) {
                    remsRequestCompletedStatus = "Pending";
                  }
                  // matchedMetReq2.case_numbers.push(case_number);
                  await metRequirementsCollection.updateOne(matchedMetReq2, {$addToSet: {case_numbers: case_number}});
                } else {
                 // create the metReq that was submitted
                 let newMetReq = {
                  completed: false,
                  completedQuestionnaire: null,
                  requirementName: requirement2.name,
                  requirementDescription: requirement2.description,
                  drugName: drug.name,
                  stakeholderId: reqStakeholder2Reference,
                  case_numbers: [case_number],
                };

                remsRequestCompletedStatus = "Pending";

                await metRequirementsCollection.insertOne(newMetReq
                //   , (err: any, result: any) => {
                //   if (err) console.log(err);
                //   console.log('Inserted New Met Requirement');
                // }
                );

                const newMetReqDoc = await metRequirementsCollection.findOne(newMetReq);


                remsRequest.metRequirements.push(
                  {
                    stakeholderId : newMetReqDoc.stakeholderId,
                    completed : newMetReqDoc.completed,
                    metRequirementId: newMetReqDoc._id,
                    requirementName: newMetReqDoc.requirementName,
                    requirementDescription: newMetReqDoc.requirementDescription,
                  }
                );
                }
              } 
            }

            remsRequest.status = remsRequestCompletedStatus;
            await remsCaseCollection.insertOne(remsRequest
            //   , (err: any, result: any) => {
            //   if (err) console.log(err);
            //   console.log('Inserted Rems Case');
            // }
            );
            returnedRemsRequestDoc = await remsCaseCollection.findOne(remsRequest);
          } else {
            const matchedMetReq3 = await metRequirementsCollection.findOne({stakeholderId: reqStakeholderReference, requirementName: requirement.name, drugName: drug.name});
            if (matchedMetReq3) {
              // matchedMetReq3.completed = true;
              // matchedMetReq3.completedQuestionnaire = questionnaireResponse;
              await metRequirementsCollection.updateOne(matchedMetReq3, {$set: {completed: true, completedQuestionnaire: questionnaireResponse}});

              returnedMetReqDoc = await metRequirementsCollection.findOne({_id: matchedMetReq3._id});

              // this should be an array returned via .find() - tried using $in but could not get it to work - using the first element for now as a work around since we only have one patient
              const remsRequestToUpdate = await remsCaseCollection.findOne({ case_number: returnedMetReqDoc.case_numbers[0] }); 

              // for (let remsRequestToUpdate of remsRequestsToUpdate) {
                let foundUncompleted = false;
                let metReqArray = remsRequestToUpdate.metRequirements;
                for (let i=0; i < remsRequestToUpdate.metRequirements.length; i++) {
                  let req4 = remsRequestToUpdate.metRequirements[i];
                  // _id comparison would not work for some reason
                  if(req4.requirementName === matchedMetReq3.requirementName) {
                    metReqArray[i].completed = true;
                    req4.completed = true;
                    const update = await remsCaseCollection.updateOne({_id: remsRequestToUpdate._id}, {$set: {metRequirements: metReqArray}});
                  }
                  if(!req4.completed){
                    foundUncompleted = true;
                  }
                }
                // remsRequestToUpdate.metRequirements.forEach(async (req4: any, index: number) => {
       
                // });

                if(!foundUncompleted && remsRequestToUpdate.status === "Pending") {
                  // remsRequestToUpdate.status = "Approved";
                  await remsCaseCollection.updateOne(remsRequestToUpdate, {$set: {status: "Approved"}});
                }

  
              // }

            } else {
             // create the metReq that was submitted
             let newMetReq3 = {
              completed: true,
              completedQuestionnaire: questionnaireResponse,
              requirementName: requirement.name,
              requirementDescription: requirement.requirementDescription,
              drugName: drug.name,
              stakeholderId: reqStakeholderReference,
              case_numbers: [],
            };

            await metRequirementsCollection.insertOne(newMetReq3
            //   , (err: any, result: any) => {
            //   if (err) console.log(err);
            //   console.log('Inserted New Met Requirement');
            // }
            );
            returnedMetReqDoc = await metRequirementsCollection.findOne(newMetReq3);
            }
          }
          break;
        }
      }

      // return MetReq unless a new case is created in which case return the Rems request
      if (returnRemsRequest) {
        res.send(returnedRemsRequestDoc);
      } else  {
        res.send(returnedMetReqDoc);
      }
    });

    return this;
  }

  getResource(bundle: { entry: any[]; }, resourceReference: string) {
    let temp = resourceReference.split("/");
    let _resourceType = temp[0];
    let _id = temp[1];

    for (let i = 0; i < bundle.entry.length; i++) {
      if ((bundle.entry[i].resource.resourceType === _resourceType)
        && (bundle.entry[i].resource.id === _id)) {
        return bundle.entry[i].resource;
      }
    }
    return null;
  }

  getQuestionnaireResponse(bundle: { entry: any[]; }) {
    let _resourceType = "QuestionnaireResponse";

    for (let i = 0; i < bundle.entry.length; i++) {
      if ((bundle.entry[i].resource.resourceType === _resourceType)) {
        return bundle.entry[i].resource;
      }
    }
    return null;
  }



  /**
   * @method listen
   * @description Start listening on the configured port
   * @param {number} port - Defualt port to listen on
   * @param {function} [callback] - Optional callback for listen
   */
  listen({ port }: any, callback: any) {
    return this.app.listen(port, callback);
  }
}

// Start the application

export { REMSServer, initialize };
