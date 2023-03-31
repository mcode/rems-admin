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
import { FhirResource, Library, Patient, Questionnaire, Resource } from 'fhir/r4';
import LibraryModel from '../lib/schemas/resources/Library';
import PatientModel from '../lib/schemas/resources/Patient';
import QuestionnaireModel from '../lib/schemas/resources/Questionnaire';
import QuestionnaireResponseModel from '../lib/schemas/resources/QuestionnaireResponse';
import ValueSetModel from '../lib/schemas/resources/ValueSet';
import { Model } from 'mongoose';
import { medicationCollection, metRequirementsCollection } from './models';

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

  static async store(
    resource: FhirResource,
    model: Model<any>,
    resolve: any,
    reject: any,
    baseVersion = '4_0_0'
  ) {
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
    const fhirResource = new model(resource);
    // Create the resource's metadata
    const Meta = FhirUtilities.getMeta(baseVersion);
    fhirResource.meta = new Meta({
      versionId: '1',
      lastUpdated: moment.utc().format('YYYY-MM-DDTHH:mm:ssZ')
    });

    model.exists({ id: fhirResource.id }).then(doesExist => {
      if (!doesExist) {
        try {
          resolve(fhirResource.save());
          ('resolve');
        } catch {
          reject();
        }
      } else {
        reject();
      }
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
              // Build the strings to connect to the collections
              let model;
              switch (resource.resourceType) {
                case 'Library':
                  model = LibraryModel;
                  await QuestionnaireUtilities.processLibraryCodeFilters(resource, {});
                  break;
                case 'Patient':
                  model = PatientModel;
                  break;
                case 'Questionnaire':
                  model = QuestionnaireModel;
                  break;
                case 'QuestionnaireResponse':
                  model = QuestionnaireResponseModel;
                  break;
                case 'ValueSet':
                  model = ValueSetModel;
                  break;
              }
              if (model) {
                await FhirUtilities.store(
                  resource,
                  model,
                  function () {
                    return;
                  },
                  function () {
                    return;
                  }
                );
              } else {
                console.log('    Unsupported FHIR Resource Type');
              }
            } catch (parseError: any) {
              console.warn('Failed to parse json file: ' + filePath);
              console.warn(parseError);
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
    // prepopulateDB
    await medicationCollection.insertMany([
      {
        name: 'Turalio',
        codeSystem: 'http://www.nlm.nih.gov/research/umls/rxnorm',
        code: '2183126',
        requirements: [
          {
            name: 'Patient Enrollment',
            description: 'Submit Patient Enrollment form to the REMS Administrator',
            stakeholderType: 'patient',
            createNewCase: true,
            resourceId: 'TuralioRemsPatientEnrollment'
          },
          {
            name: 'Prescriber Enrollment',
            description: 'Submit Prescriber Enrollment form to the REMS Administrator',
            stakeholderType: 'prescriber',
            createNewCase: false,
            resourceId: 'TuralioPrescriberEnrollmentForm'
          },
          {
            name: 'Prescriber Knowledge Assessment',
            description: 'Submit Prescriber Knowledge Assessment form to the REMS Administrator',
            stakeholderType: 'prescriber',
            createNewCase: false,
            resourceId: 'TuralioPrescriberKnowledgeAssessment'
          },
          {
            name: 'Pharmacist Enrollment',
            description: 'Submit Pharmacist Enrollment form to the REMS Administrator',
            stakeholderType: 'pharmacist',
            createNewCase: false,
            resourceId: 'TuralioPharmacistEnrollment'
          }
        ]
      },
      {
        name: 'TIRF',
        codeSystem: 'http://www.nlm.nih.gov/research/umls/rxnorm',
        code: '1237051',
        requirements: [
          {
            name: 'Patient Enrollment',
            description: 'Submit Patient Enrollment form to the REMS Administrator',
            stakeholderType: 'patient',
            createNewCase: true,
            resourceId: 'TIRFRemsPatientEnrollment'
          },
          {
            name: 'Prescriber Enrollment',
            description: 'Submit Prescriber Enrollment form to the REMS Administrator',
            stakeholderType: 'prescriber',
            createNewCase: false,
            resourceId: 'TIRFPrescriberEnrollmentForm'
          },
          {
            name: 'Prescriber Knowledge Assessment',
            description: 'Submit Prescriber Knowledge Assessment form to the REMS Administrator',
            stakeholderType: 'prescriber',
            createNewCase: false,
            resourceId: 'TIRFPrescriberKnowledgeAssessment'
          },
          {
            name: 'Pharmacist Enrollment',
            description: 'Submit Pharmacist Enrollment form to the REMS Administrator',
            stakeholderType: 'pharmacist',
            createNewCase: false,
            resourceId: 'TIRFPharmacistEnrollmentForm'
          },
          {
            name: 'Pharmacist Knowledge Assessment',
            description: 'Submit Pharmacist Knowledge Assessment form to the REMS Administrator',
            stakeholderType: 'pharmacist',
            createNewCase: false,
            resourceId: 'TIRFPharmacistKnowledgeAssessment'
          }
        ]
      },
      {
        name: 'Isotretinoin',
        codeSystem: 'http://www.nlm.nih.gov/research/umls/rxnorm',
        code: '6064',
        requirements: [
          {
            name: 'Patient Enrollment',
            description: 'Submit Patient Enrollment form to the REMS Administrator',
            stakeholderType: 'patient',
            createNewCase: true,
            resourceId: 'IPledgeRemsPatientEnrollment'
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
          }
        ]
      }
    ]);

    await metRequirementsCollection.insertMany([
      {
        stakeholderId: 'Organization/pharm0111',
        completed: true,
        requirementName: 'Pharmacist Enrollment',
        drugName: 'Turalio',
        completedQuestionnaire: null,
        case_numbers: []
      },
      {
        stakeholderId: 'Organization/pharm0111',
        completed: true,
        requirementName: 'Pharmacist Enrollment',
        drugName: 'TIRF',
        completedQuestionnaire: null,
        case_numbers: []
      },
      {
        stakeholderId: 'Organization/pharm0111',
        completed: true,
        requirementName: 'Pharmacist Knowledge Assessment',
        drugName: 'TIRF',
        completedQuestionnaire: null,
        case_numbers: []
      },
      {
        stakeholderId: 'Organization/pharm0111',
        completed: true,
        requirementName: 'Pharmacist Enrollment',
        drugName: 'Isotretinoin',
        completedQuestionnaire: null,
        case_numbers: []
      }
    ]);
  }
}
