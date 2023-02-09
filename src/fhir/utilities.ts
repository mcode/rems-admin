import { resolveSchema } from '@projecttacoma/node-fhir-server-core';
import * as moment from 'moment';
import 'moment-timezone';
import { v1 as uuidv1 } from 'uuid';

import constants from '../constants';
import { Globals } from '../globals';
import * as path from 'path';
import * as fs from 'fs';
import * as process from 'process';
import crypto from 'crypto';
import { QuestionnaireUtilities } from './questionnaireUtilities';

const re = /(?:\.([^.]+))?$/;

export class FhirUtilities {
  static getLibrary(baseVersion: string) {
    return resolveSchema(baseVersion, 'Library');
  }

  static getPatient(baseVersion: string) {
    return resolveSchema(baseVersion, 'Patient');
  }

  static getQuestionnaire(baseVersion: string) {
    return resolveSchema(baseVersion, 'Questionnaire');
  }

  static getQuestionnaireResponse(baseVersion: string) {
    return resolveSchema(baseVersion, 'QuestionnaireResponse');
  }

  static getValueSet(baseVersion: string) {
    return resolveSchema(baseVersion, 'ValueSet');
  }

  static getMeta = (baseVersion: string) => {
    return resolveSchema(baseVersion, 'Meta');
  };

  static async store(resource: any, resolve: any, reject: any, baseVersion = '4_0_0') {
    const db = Globals.database;

    // If no resource ID was provided, generate one.
    let id = '';
    if (!resource.id) {
      // If no resource ID was provided, generate one.
      id = crypto.randomUUID();
    } else {
      id = resource.id;
    }
    console.log('    FhirUtilities::store: ' + resource.resourceType + ' -- ' + id);

    let collectionString = '';
    let historyCollectionString = '';

    // Build the strings to connect to the collections
    switch (resource.resourceType) {
      case 'Library':
        collectionString = `${constants.COLLECTION.LIBRARY}_${baseVersion}`;
        historyCollectionString = `${constants.COLLECTION.LIBRARY}_${baseVersion}_History`;
        await QuestionnaireUtilities.processLibraryCodeFilters(resource, {});
        break;
      case 'Patient':
        collectionString = `${constants.COLLECTION.PATIENT}_${baseVersion}`;
        historyCollectionString = `${constants.COLLECTION.PATIENT}_${baseVersion}_History`;
        break;
      case 'Questionnaire':
        collectionString = `${constants.COLLECTION.QUESTIONNAIRE}_${baseVersion}`;
        historyCollectionString = `${constants.COLLECTION.QUESTIONNAIRE}_${baseVersion}_History`;
        break;
      case 'QuestionnaireResponse':
        collectionString = `${constants.COLLECTION.QUESTIONNAIRERESPONSE}_${baseVersion}`;
        historyCollectionString = `${constants.COLLECTION.QUESTIONNAIRERESPONSE}_${baseVersion}_History`;
        break;
      case 'ValueSet':
        collectionString = `${constants.COLLECTION.VALUESET}_${baseVersion}`;
        historyCollectionString = `${constants.COLLECTION.VALUESET}_${baseVersion}_History`;
        break;
    }

    const Resource = resolveSchema(baseVersion, resource.resourceType);

    const fhirResource = new Resource(resource);

    // Create the resource's metadata
    const Meta = FhirUtilities.getMeta(baseVersion);
    fhirResource.meta = new Meta({
      versionId: '1',
      lastUpdated: moment.utc().format('YYYY-MM-DDTHH:mm:ssZ')
    });

    if (collectionString === '') {
      reject('    Unsupported FHIR Resource Type');
    }
    const collection = db.collection(collectionString);

    // Create the document to be inserted into teh database
    const doc = JSON.parse(JSON.stringify(fhirResource.toJSON()));
    Object.assign(doc, { id: id });

    // Create a clone of the object without the _id parameter before assigning a value to
    // the _id parameter in the original document
    const history_doc = Object.assign({}, doc);
    Object.assign(doc, { _id: id });

    // Insert our resource record
    await collection.insertOne(doc, async (err: any) => {
      if (err) {
        console.log('    Error with %s.create: ', resource.resourceType, err.message);
        reject(err);
        return;
      } else {
        console.log('    Successfully added ' + resource.resourceType + ' -- ' + id);
      }

      // Save the resource to history
      const history_collection = db.collection(historyCollectionString);

      // Insert our patient record to history but don't assign _id
      await history_collection.insertOne(history_doc, (err2: any) => {
        if (err2) {
          console.log('    Error with %sHistory.create: ', resource.resourceType, err2.message);
          reject(err2);
          return;
        }
        resolve({ id: doc.id, resource_version: doc.meta.versionId });
      });
    });
  }

  static async loadFile(filePath: string, file: any) {
    const extension = re.exec(filePath);
    if (extension) {
      if (extension[1].toLowerCase() === 'json') {
        if (file !== 'TopicMetadata.json') {
          console.log("'%s' is a JSON Resource file.", filePath);
          fs.readFile(filePath, 'utf8', async (err: any, jsonString: string) => {
            if (err) {
              console.error('Failed to read file:', err);
              return;
            }
            try {
              const resource = JSON.parse(jsonString);
              await FhirUtilities.store(
                resource,
                function () {
                  return;
                },
                function () {
                  return;
                }
              );
            } catch (parseError: any) {
              console.warn('Failed to parse json file: ' + filePath);
            }
          });
        }
      }
    }
  }

  static async loadResources(resourcePath: string) {
    console.log('Loading FHIR Resources from: ' + resourcePath);

    // Loop through all the files in the directory looking for folders
    fs.readdir(resourcePath, function (rootError: any, rootFiles: any) {
      if (rootError) {
        console.error('Could not list the directory.', rootError);
        process.exit(1);
      }

      rootFiles.forEach(function (rootFile: any) {
        const rootFilePath = path.join(resourcePath, rootFile);

        fs.stat(rootFilePath, function (rootFileError: any, rootFileStat: any) {
          if (rootFileError) {
            console.error('Error getting root folder file statistics.', rootFileError);
            return;
          }

          if (rootFileStat.isDirectory()) {
            // loop through all the fhir versions looking for R4
            fs.readdir(rootFilePath, function (rulesErr: any, rulesFiles: any) {
              if (rulesErr) {
                console.error('Error getting rule folder file list.', rulesErr);
              }

              rulesFiles.forEach(function (rulesFile: any) {
                const rulesFilePath = path.join(rootFilePath, rulesFile);

                fs.stat(rulesFilePath, function (rulesFileError: any, rulesFileStat: any) {
                  if (rulesFileError) {
                    console.error('Error getting rules folder file statistics.', rulesFileError);
                    return;
                  }

                  if (rulesFileStat.isDirectory()) {
                    // only process the R4 directory
                    if (rulesFile === 'R4') {
                      fs.readdir(
                        rulesFilePath,
                        function (fhirVersionErr: any, fhirVersionFiles: any) {
                          if (fhirVersionErr) {
                            console.error('Error getting fhir folder file list.', fhirVersionErr);
                            return;
                          }

                          // loop through all the folders in the R4 folder
                          fhirVersionFiles.forEach(function (fhirVersionFile: any) {
                            const fhirVersionFilePath = path.join(rulesFilePath, fhirVersionFile);

                            fs.stat(
                              fhirVersionFilePath,
                              function (fhirVersionFileError: any, fhirVersionFileStat: any) {
                                if (fhirVersionFileError) {
                                  console.error(
                                    'Error getting fhir version file statistics.',
                                    fhirVersionFileError
                                  );
                                  return;
                                }

                                if (fhirVersionFileStat.isDirectory()) {
                                  if (fhirVersionFile === 'resources') {
                                    console.log(fhirVersionFilePath);

                                    fs.readdir(
                                      fhirVersionFilePath,
                                      function (resourceFilesErr: any, resourceFiles: any) {
                                        if (resourceFilesErr) {
                                          console.error(
                                            'Error getting resource folder file list.',
                                            resourceFilesErr
                                          );
                                          return;
                                        }

                                        resourceFiles.forEach(function (resourceFile: any) {
                                          const resourceFilePath = path.join(
                                            fhirVersionFilePath,
                                            resourceFile
                                          );

                                          fs.stat(
                                            resourceFilePath,
                                            function (
                                              resourceFileError: any,
                                              resourceFileStat: any
                                            ) {
                                              if (resourceFileError) {
                                                console.error(
                                                  'Error getting resource file statistics.',
                                                  resourceFileError
                                                );
                                                return;
                                              }

                                              if (resourceFileStat.isFile()) {
                                                FhirUtilities.loadFile(
                                                  resourceFilePath,
                                                  resourceFile
                                                );
                                              }
                                            }
                                          );
                                        });
                                      }
                                    );
                                  }
                                }
                              }
                            );
                          });
                        }
                      );
                    }
                  }
                });
              });
            });
          }
        });
      });
    });
  }

  static async populateDB() {
    const db = Globals.database;


    // define schemas
    const medicationCollection = await db.collection('medication-requirements'
    // , {
    //   'name': { 'type': 'string' },
    //   'codeSystem': { 'type': 'string' },
    //   'code': { 'type': 'string' },
    //   'requirements': {
    //     'type': 'array',
    //     'items': {
    //       'type': 'object',
    //       'properties': {
    //         'name': { 'type': 'string' },
    //         'description': { 'type': 'string' },
    //         'questionnaire': { 'type': 'object' },
    //         'stakeholderType': { 'type': 'string' },
    //         'createNewCase': { 'type': 'boolean' },
    //         'resourceId': { 'type': 'string' }
    //       }
    //     }
    //   }
    // }, (err: any, collection: any) => {
    //   if (err) console.log(err);
    // }
    );


    await medicationCollection.createIndex({ name: 1 }, { unique: true });

    const metRequirementsCollection = await db.collection('met-requirements'
    // , {
    //   'completed': { 'type': 'boolean' },
    //   'completedQuestionnaire': { 'type': 'object' },
    //   'requirementName': { 'type': 'string' },
    //   'requirementDescription': {'type': 'string'}
    //   'drugName': { 'type': 'string' },
    //   'stakeholderId': { 'type': 'string' },
    //   'case_numbers': { 'type': 'array', 'items': { 'type': 'string' } }
    // }, (err: any, collection: any) => {
    //   if (err) console.log(err);
    // }
    );


    metRequirementsCollection.createIndex({ drugName: 1, requirementName: 1, stakeholderId: 1 }, { unique: true });


    const remsCaseCollection = await db.collection('rems-case'
    // , {
    //   'case_number': { 'type': 'string' },
    //   'status': { 'type': 'string' },
    //   'drugName': { 'type': 'string' },
    //   'patientName': { 'type': 'string' },
    //   'metRequirements': {
    //     'type': 'array',
    //     'items': {
    //       'type': 'object',
    //       'properties': {
    //         'metRequirementId': { 'type': 'number' },
    //         'completed': { 'type': 'boolean' },
    //         'stakeholderId': { 'type': 'string' },
    //         'requirementName': { 'type': 'string' },
    //         'requirementDescription': {'type': 'string'},
    //       }
    //     }
    //   }
    // }, (err: any, collection: any) => {
    //   if (err) throw err;
    // }
    );


    // prepopulateDB
    medicationCollection.insert([{
      name: 'Turalio',
      codeSystem: 'http://www.nlm.nih.gov/research/umls/rxnorm',
      code: '2183126',
      requirements: [{
        name: 'Patient Enrollment',
        description: 'Submit Patient Enrollment form to the REMS Administrator',
        stakeholderType: 'patient',
        createNewCase: true,
        resourceId: 'TuralioRemsPatientEnrollment',
      },
      {
        name: 'Prescriber Enrollment',
        description: 'Submit Prescriber Enrollment form to the REMS Administrator',
        stakeholderType: 'prescriber',
        createNewCase: false,
        resourceId: 'TuralioPrescriberEnrollmentForm',
      },
      {
        name: 'Prescriber Knowledge Assessment',
        description: 'Submit Prescriber Knowledge Assessment form to the REMS Administrator',
        stakeholderType: 'prescriber',
        createNewCase: false,
        resourceId: 'TuralioPrescriberKnowledgeAssessment',
      },
      {
        name: 'Pharmacist Enrollment',
        description: 'Submit Pharmacist Enrollment form to the REMS Administrator',
        stakeholderType: 'pharmacist',
        createNewCase: false,
        resourceId: 'TuralioPharmacistEnrollment',
      },
      ]
    },
    {
      name: 'TIRF',
      codeSystem: 'http://www.nlm.nih.gov/research/umls/rxnorm',
      code: '1237051',
      requirements: [{
        name: 'Patient Enrollment',
        description: 'Submit Patient Enrollment form to the REMS Administrator',
        stakeholderType: 'patient',
        createNewCase: true,
        resourceId: 'TIRFRemsPatientEnrollment',
      },
      {
        name: 'Prescriber Enrollment',
        description: 'Submit Prescriber Enrollment form to the REMS Administrator',
        stakeholderType: 'prescriber',
        createNewCase: false,
        resourceId: 'TIRFPrescriberEnrollmentForm',
      },
      {
        name: 'Prescriber Knowledge Assessment',
        description: 'Submit Prescriber Knowledge Assessment form to the REMS Administrator',
        stakeholderType: 'prescriber',
        createNewCase: false,
        resourceId: 'TIRFPrescriberKnowledgeAssessment',
      },
      {
        name: 'Pharmacist Enrollment',
        description: 'Submit Pharmacist Enrollment form to the REMS Administrator',
        stakeholderType: 'pharmacist',
        createNewCase: false,
        resourceId: 'TIRFPharmacistEnrollmentForm',
      },
      {
        name: 'Pharmacist Knowledge Assessment',
        description: 'Submit Pharmacist Knowledge Assessment form to the REMS Administrator',
        stakeholderType: 'pharmacist',
        createNewCase: false,
        resourceId: 'TIRFPharmacistKnowledgeAssessment',
      },
      ]
    },
    {
      name: 'IPledge',
      codeSystem: 'http://www.nlm.nih.gov/research/umls/rxnorm',
      code: '6064',
      requirements: [{
        name: 'Patient Enrollment',
        description: 'Submit Patient Enrollment form to the REMS Administrator',
        stakeholderType: 'patient',
        createNewCase: true,
        resourceId: 'IPledgeRemsPatientEnrollment',
      },
      {
        name: 'Prescriber Enrollment',
        description: 'Submit Prescriber Enrollment form to the REMS Administrator',
        stakeholderType: 'prescriber',
        createNewCase: false,
        resourceId: 'IPledgeRemsPrescriberEnrollmentForm'
      },
      {
        name: 'Pharmacist Enrollment',
        description: 'Submit Pharmacist Enrollment form to the REMS Administrator',
        stakeholderType: 'pharmacist',
        createNewCase: false,
        resourceId: 'IPledgeRemsPharmacistEnrollmentForm'
      },
      ]
    },
    ], (err: any, result: any) => {
      if (err) console.log(err);
      console.log('Inserted Drug Information');
    });

    metRequirementsCollection.insert([{
      stakeholderId: 'Organization/pharm0111',
      completed: true,
      requirementName: 'Pharmacist Enrollment',
      drugName: 'Turalio',
      completedQuestionnaire: null,  
      case_numbers: [],       
    },
    {
      stakeholderId: 'Organization/pharm0111',
      completed: true,
      requirementName: 'Pharmacist Enrollment',
      drugName: 'TIRF',
      completedQuestionnaire: null,   
      case_numbers: [],   
    },
    {
      stakeholderId: 'Organization/pharm0111',
      completed: true,
      requirementName: 'Pharmacist Knowledge Assessment',
      drugName: 'TIRF',
      completedQuestionnaire: null,     
      case_numbers: [],    
    },
    {
      stakeholderId: 'Organization/pharm0111',
      completed: true,
      requirementName: 'Pharmacist Enrollment',
      drugName: 'IPledge',
      completedQuestionnaire: null, 
      case_numbers: [],        
    }], (err: any, result: any) => {
      if (err) console.log(err);
      console.log('Inserted Pharmacist Met Requirements');
    });
  }
}
