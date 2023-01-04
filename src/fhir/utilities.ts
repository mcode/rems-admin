/* eslint-disable */
const { resolveSchema } = require('@projecttacoma/node-fhir-server-core');
/* eslint-enaable */
import * as moment from 'moment';
import 'moment-timezone';

import constants from '../constants';
import { Globals } from '../globals';
import * as path from 'path';
import * as fs from 'fs';
import * as process from 'process';

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
      id = self.crypto.randomUUID();
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
      return reject('    Unsupported FHIR Resource Type');
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
        return reject(err);
      } else {
        console.log('    Successfully added ' + resource.resourceType + ' -- ' + id);
      }

      // Save the resource to history
      const history_collection = db.collection(historyCollectionString);

      // Insert our patient record to history but don't assign _id
      return history_collection.insert(history_doc, (err2: any) => {
        if (err2) {
          console.log('    Error with %sHistory.create: ', resource.resourceType, err2.message);
          return reject(err2);
        }
        return resolve({ id: doc.id, resource_version: doc.meta.versionId });
      });
    });
  }

  static loadResources(resourcePath: string) {
    console.log('Loading FHIR Resources from: ' + resourcePath);

    // Loop through all the files in the temp directory
    fs.readdir(resourcePath, function (err: any, files: any) {
      if (err) {
        console.error('Could not list the directory.', err);
        process.exit(1);
      }

      files.forEach(function (file: any) {
        // Make one pass and make the file complete
        const filePath = path.join(resourcePath, file);

        fs.stat(filePath, function (error: any, stat: any) {
          if (error) {
            console.error('Error getting file statistics.', error);
            return;
          }

          if (stat.isFile()) {
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
                  });
                }
              }
            }
          } else if (stat.isDirectory()) {
            FhirUtilities.loadResources(filePath);
          }
        });
      });
    });
  }
}
