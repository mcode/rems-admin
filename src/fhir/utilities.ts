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
    collection.insert(doc, (err: any) => {
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
      history_collection.insert(history_doc, (err2: any) => {
        if (err2) {
          console.log('    Error with %sHistory.create: ', resource.resourceType, err2.message);
          reject(err2);
          return;
        }
        resolve({ id: doc.id, resource_version: doc.meta.versionId });
      });
    });
  }

  static loadFile(filePath: string, file: any) {
    const extension = re.exec(filePath);
    if (extension) {
      if (extension[1].toLowerCase() === 'json') {
        if (file !== 'TopicMetadata.json') {
          console.log("'%s' is a JSON Resource file.", filePath);
          fs.readFile(filePath, 'utf8', (err: any, jsonString: string) => {
            if (err) {
              console.error('Failed to read file:', err);
              return;
            }
            try {
              const resource = JSON.parse(jsonString);
              FhirUtilities.store(
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

  static loadResources(resourcePath: string) {
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
}
