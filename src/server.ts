import cors from 'cors';
import bodyParser from 'body-parser';
import container from './lib/winston';
import morgan from 'morgan';
import Hook from './hooks/Hook';
import remsService from './hooks/rems.hook';
// import etasuService from './services/etasu.service'
import { Server } from '@projecttacoma/node-fhir-server-core';
import { Globals } from './globals';
import { uid } from 'uid';




const logger = container.get('application');

const initialize = (config: any) => {
  //const logLevel = _.get(config, 'logging.level');
  return new REMSServer(config.fhirServerConfig)
    .configureEtasuEndpoints()
    .configureMiddleware()
    .configureSession()
    .configureHelmet()
    .configurePassport()
    .setPublicDirectory()
    .setProfileRoutes()
    .registerCdsHooks(config.server)
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
    // etasu endpoints 


    const db = Globals.database;

    // define schemas
    const medicationCollection = db.createCollection("medication-requirements", {
      "name": { "type": "string" },
      "codeSystem": { "type": "string" },
      "code": { "type": "string" },
      "requirements": {
        "type": "array",
        "items": {
          "type": "object",
          "properties": {
            "name": { "type": "string" },
            "description": { "type": "string" },
            "questionnaire": { "type": "object" },
            "stakeholderType": { "type": "string" },
            "createNewCase": { "type": "boolean" },
            "resourceId": { "type": "string" }
          }
        }
      }
    }, (err: any, collection: any) => {
      if (err) console.log(err);
    });

    medicationCollection.createIndex({ name: 1 }, { unique: true }, (err: any) => {
      if (err) console.log(err);
    });

    const metRequirementsCollection = db.createCollection("met-requirements", {
      "completed": { "type": "boolean" },
      "completedQuestionnaire": { "type": "object" },
      "requirementName": { "type": "string" },
      "drugName": { "type": "string" },
      "stakeholderId": { "type": "string" },
      "duplicationId": { "type": "number" },
      "case_numbers": { "type": "array", "items": { "type": "string" } }
    }, (err: any, collection: any) => {
      if (err) console.log(err);
    });

    metRequirementsCollection.createIndex({ duplicationId: 1 }, { unique: true }, (err: any) => {
      if (err) console.log(err);
    });


    const remsCaseCollection = db.createCollection("rems-case", {
      "case_number": { "type": "string" },
      "status": { "type": "string" },
      "drugName": { "type": "string" },
      "metRequirements": {
        "type": "array",
        "items": {
          "type": "object",
          "properties": {
            "metRequirementId": { "type": "number" },
            "completed": { "type": "boolean" },
            "stakeholderId": { "type": "string" },
            "requirementName": { "type": "string" },
          }
        }
      }
    }, (err: any, collection: any) => {
      if (err) throw err;
    });


    // prepopulateDB
    medicationCollection.insert([{
      name: "Turalio",
      codeSystem: "http://www.nlm.nih.gov/research/umls/rxnorm",
      code: "2183126",
      requirements: [{
        name: "Patient Enrollment",
        description: "Submit Patient Enrollment form to the REMS Administrator",
        stakeholderType: "patient",
        createNewCase: true,
        resourceId: "TuralioRemsPatientEnrollment",
      },
      {
        name: "Prescriber Enrollment",
        description: "Submit Prescriber Enrollment form to the REMS Administrator",
        stakeholderType: "prescriber",
        createNewCase: false,
        resourceId: "TuralioPrescriberEnrollmentForm",
      },
      {
        name: "Prescriber Knowledge Assessment",
        description: "Submit Prescriber Knowledge Assessment form to the REMS Administrator",
        stakeholderType: "prescriber",
        createNewCase: false,
        resourceId: "TuralioPrescriberKnowledgeAssessment",
      },
      {
        name: "Pharmacist Enrollment",
        description: "Submit Pharmacist Enrollment form to the REMS Administrator",
        stakeholderType: "pharmacist",
        createNewCase: false,
      },
      ]
    },
    {
      name: "TIRF",
      codeSystem: "http://www.nlm.nih.gov/research/umls/rxnorm",
      code: "1237051",
      requirements: [{
        name: "Patient Enrollment",
        description: "Submit Patient Enrollment form to the REMS Administrator",
        stakeholderType: "patient",
        createNewCase: true,
        resourceId: "TIRFRemsPatientEnrollment",
      },
      {
        name: "Prescriber Enrollment",
        description: "Submit Prescriber Enrollment form to the REMS Administrator",
        stakeholderType: "prescriber",
        createNewCase: false,
        resourceId: "TIRFPrescriberEnrollmentForm",
      },
      {
        name: "Prescriber Knowledge Assessment",
        description: "Submit Prescriber Knowledge Assessment form to the REMS Administrator",
        stakeholderType: "prescriber",
        createNewCase: false,
        resourceId: "TIRFPrescriberKnowledgeAssessment",
      },
      {
        name: "Pharmacist Enrollment",
        description: "Submit Pharmacist Enrollment form to the REMS Administrator",
        stakeholderType: "pharmacist",
        createNewCase: false,
      },
      {
        name: "Pharmacist Knowledge Assessment",
        description: "Submit Pharmacist Knowledge Assessment form to the REMS Administrator",
        stakeholderType: "pharmacist",
        createNewCase: false,
      },
      ]
    },
    {
      name: "IPledge",
      codeSystem: "http://www.nlm.nih.gov/research/umls/rxnorm",
      code: "6064",
      requirements: [{
        name: "Patient Enrollment",
        description: "Submit Patient Enrollment form to the REMS Administrator",
        stakeholderType: "patient",
        createNewCase: true,
        resourceId: "IPledgeRemsPatientEnrollment",
      },
      {
        name: "Prescriber Enrollment",
        description: "Submit Prescriber Enrollment form to the REMS Administrator",
        stakeholderType: "prescriber",
        createNewCase: false,
        resourceId: "IPledgeRemsPrescriberEnrollmentForm"
      },
      {
        name: "Pharmacist Enrollment",
        description: "Submit Pharmacist Enrollment form to the REMS Administrator",
        stakeholderType: "pharmacist",
        createNewCase: false,
      },
      ]
    },
    ], (err: any, result: any) => {
      if (err) console.log(err);
      console.log('Inserted Drug Information');
    });

    metRequirementsCollection.insert([{
      stakeholderId: "Organization/pharm0111",
      completed: true,
      requirementName: "Pharmacist Enrollment",
      drugName: "Turalio",
      duplicationId: 1
    },
    {
      stakeholderId: "Organization/pharm0111",
      completed: true,
      requirementName: "Pharmacist Enrollment",
      drugName: "TIRF",
      duplicationId: 2
    },
    {
      stakeholderId: "Organization/pharm0111",
      completed: true,
      requirementName: "Pharmacist Knowledge Assessment",
      drugName: "TIRF",
      duplicationId: 3
    },
    {
      stakeholderId: "Organization/pharm0111",
      completed: true,
      requirementName: "Pharmacist Enrollment",
      drugName: "IPledge",
      duplicationId: 4
    }], (err: any, result: any) => {
      if (err) console.log(err);
      console.log('Inserted Pharmacist Met Requirements');
    });

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

    this.app.post('/etasu/met', (req: any, res: { send: (arg0: string) => any }) => {
      let returnedRemsRequestDoc: any;
      let returnedMetReqDoc: any;
      let returnRemsRequest = false;
      const requestBody = req.body;


      // extract params and questionnaire response identifier
      let params = this.getResource(requestBody, requestBody.entry[0].resource.focus.parameters.reference.textValue);
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
      const drug = medicationCollection.findOne({ code: prescriptionCode, codeSystem: prescriptionSystem });

      // iterate through each requirement of the drug
      for (let requirement of drug.requirements) {
        // figure out which stakeholder the req corresponds to 
        let reqStakeholder = requirement.stakeholderType;
        let reqStakeholderReference = reqStakeholder.equals("prescriber") ? practitionerReference : (reqStakeholder.equals("pharmacist") ? pharmacistReference : patientReference);

        // if the requirement is the one submitted continue
        if (requirement.resourceId.equals(requirementId)) {

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
              requirements : [],
           };
            returnRemsRequest = true;

            // create the metReq that was submitted
            let metReq = {
              completed: true,
              completedQuestionnaire: questionnaireResponse,
              requirementName: requirement.name,
              drugName: drug.name,
              stakeholderId: reqStakeholderReference,
              case_numbers: [case_number],
            };

            const matchedMetReq = metRequirementsCollection.insert(metReq, (err: any, result: any) => {
              if (err) console.log(err);
              console.log('Inserted Matched Met Requirement');
            });
            
            remsRequest.requirements.push(
              {
                stakeholderId : matchedMetReq.stakeholderId,
                completed : matchedMetReq.completed,
                metRequirementId: matchedMetReq._id,
                requirementName: matchedMetReq.requirementName,
              }
            );
       
            // iterate through all other reqs again to create corresponding false metReqs / assign to existing 
            for (let requirement2 of drug.requirements) {
              // skip if the req found is the same as in the outer loop and has already been processed
              if (!requirement2.resourceId.equals(requirementId)) {
                // figure out which stakeholder the req corresponds to 
                let reqStakeholder2 = requirement2.stakeholderType;
                let reqStakeholder2Reference = reqStakeholder2.equals("prescriber") ? practitionerReference : (reqStakeholder2.equals("pharmacist") ? pharmacistReference : patientReference);
                
                const matchedMetReq2 = metRequirementsCollection.findOne({stakeholderId: reqStakeholder2Reference, requirementName: requirement2.name, drugName: drug.name});
                if (matchedMetReq2) {
                  remsRequest.requirements.push(
                    {
                      stakeholderId : matchedMetReq2.stakeholderId,
                      completed : matchedMetReq2.completed,
                      metRequirementId: matchedMetReq2._id,
                      requirementName: matchedMetReq2.requirementName,
                    }
                  );
                  if(!matchedMetReq2.completed) {
                    remsRequestCompletedStatus = "Pending";
                  }
                  matchedMetReq2.case_numbers.push(case_number);
                  metRequirementsCollection.update({_id: matchedMetReq2._id}, matchedMetReq2);
                } else {
                 // create the metReq that was submitted
                 let newMetReq = {
                  completed: false,
                  completedQuestionnaire: null,
                  requirementName: requirement2.name,
                  drugName: drug.name,
                  stakeholderId: reqStakeholder2Reference,
                  case_numbers: [case_number],
                };

                remsRequestCompletedStatus = "Pending";

                const newMetReqDoc = metRequirementsCollection.insert(newMetReq, (err: any, result: any) => {
                  if (err) console.log(err);
                  console.log('Inserted New Met Requirement');
                });

                remsRequest.requirements.push(
                  {
                    stakeholderId : newMetReqDoc.stakeholderId,
                    completed : newMetReqDoc.completed,
                    metRequirementId: newMetReqDoc._id,
                    requirementName: newMetReqDoc.requirementName,
                  }
                );
                }
              } 
            }

            remsRequest.status = remsRequestCompletedStatus;
            returnedRemsRequestDoc = remsCaseCollection.insert(remsRequest, (err: any, result: any) => {
              if (err) console.log(err);
              console.log('Inserted Rems Case');
            });
          } else {
            const matchedMetReq3 = metRequirementsCollection.findOne({stakeholderId: reqStakeholderReference, requirementName: requirement.name, drugName: drug.name});
            if (matchedMetReq3) {
              matchedMetReq3.completed = true;
              matchedMetReq3.completedQuestionnaire = questionnaireResponse;
              returnedMetReqDoc = metRequirementsCollection.update({_id: matchedMetReq3._id}, matchedMetReq3);

              const remsRequestsToUpdate = remsCaseCollection.find({case_number: {$in: matchedMetReq3.case_numbers}})

              for (let remsRequestToUpdate of remsRequestsToUpdate) {
                let foundUncompleted = false;
                remsRequestToUpdate.requirements.forEach((req4: any) => {
                  if(req4.metRequirementId.equals(matchedMetReq3._id)) {
                    req4.completed = true;
                  }
                  if(!req4.completed){
                    foundUncompleted = true;
                  }
                });

                if(!foundUncompleted && remsRequestToUpdate.status.equals("Pending")) {
                  remsRequestToUpdate.status = "Approved";
                }

                remsCaseCollection.update({_id: remsRequestToUpdate._id}, remsRequestToUpdate);

              }

            } else {
             // create the metReq that was submitted
             let newMetReq3 = {
              completed: true,
              completedQuestionnaire: questionnaireResponse,
              requirementName: requirement.name,
              drugName: drug.name,
              stakeholderId: reqStakeholderReference,
              case_numbers: [],
            };

            returnedMetReqDoc = metRequirementsCollection.insert(newMetReq3, (err: any, result: any) => {
              if (err) console.log(err);
              console.log('Inserted New Met Requirement');
            });
            }
          }
          break;
        }
      }

      // return MetReq unless a new case is created in which case return the Rems request
      if (returnRemsRequest) {
        res.send(returnedRemsRequestDoc);
      } else  {
        res.send(returnedRemsRequestDoc);
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
