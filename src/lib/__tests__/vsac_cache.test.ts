import VsacCache from '../vsac_cache';
import library from './fixtures/library.json';
import questionnaire from './fixtures/questionnaire.json';
import valueSet from './fixtures/valueSet.json';
import fs from 'fs';
import nock from 'nock';
import { Globals } from '../../globals';
import { Db, MongoClient } from 'mongodb';
import constants from '../../constants';
import ValueSetModel from '../schemas/resources/ValueSet';
import mongoose from 'mongoose';
describe('VsacCache', () => {
  const client = new VsacCache('./tmp', '2c1d55c3-3484-4902-b645-25f3a4974ce6');

  beforeAll(async () => {
    if (process.env.MONGO_URL) {
      console.log(process.env.MONGO_URL)
      await mongoose.connect(process.env.MONGO_URL);
    }
  });

  afterAll(async () => {
    await mongoose.connection.close()
  });
  beforeEach(async () => {
    // client.clearCache();
    const baseVersion = '4_0_0';
    const collectionString = `${constants.COLLECTION.VALUESET}_${baseVersion}`;

    await ValueSetModel.deleteMany({});
    client.onlyVsac = false;
    jest.resetModules();
  });

  // need to mock the server endpoints to we do not require hitting
  // the server for CI testing with someones api credentials

  test('should be able to collect valueset references from Library Resources', async () => {
    const valueSets = client.collectLibraryValuesets(library);
    expect(valueSets).toEqual(
      new Set([
        'http://cts.nlm.nih.gov/fhir/ValueSet/2.16.840.1.113762.1.4.1219.85',
        'http://cts.nlm.nih.gov/fhir/ValueSet/2.16.840.1.113762.1.4.1219.35'
      ])
    );
  });

  test('should be able to collect valueset references from Questionnaire Resources', async () => {
    const valueSets = client.collectQuestionnaireValuesets(questionnaire);
    expect(valueSets).toEqual(
      new Set(['http://terminology.hl7.org/ValueSet/yes-no-unknown-not-asked'])
    );
  });

  test('should be able to cache valuesets in Library Resources', async () => {
    const mockRequest = nock('http://cts.nlm.nih.gov/fhir');

    mockRequest
      .get('/ValueSet/2.16.840.1.113762.1.4.1219.85/$expand')
      .reply(200, JSON.stringify(valueSet));
    mockRequest
      .get('/ValueSet/2.16.840.1.113762.1.4.1219.35/$expand')
      .reply(200, JSON.stringify(valueSet));

    const valueSets = client.collectLibraryValuesets(library);
    valueSets.forEach(async vs => {
      expect(await client.isCached(vs)).toBeFalsy();
    });

    try {
      await client.cacheLibrary(library);
      valueSets.forEach(async vs => {
        expect(await client.isCached(vs)).toBeTruthy();
      });
    } finally {
      mockRequest.done();
    }
  });

  test('should be able to cache valuesets in Questionnaire Resources', async () => {
    const mockRequest = nock('http://terminology.hl7.org/');
    mockRequest.get('/ValueSet/yes-no-unknown-not-asked').reply(200, JSON.stringify(valueSet));

    const valueSets = client.collectQuestionnaireValuesets(questionnaire);
    valueSets.forEach(async vs => {
      expect(await client.isCached(vs)).toBeFalsy();
    });
    console.log("zzzz qr cacjhe")
    try {
      await client.cacheQuestionnaireItems(questionnaire);
      valueSets.forEach(async vs => {
        expect(await client.isCached(vs)).toBeTruthy();
      });
    } finally {
      mockRequest.done();
    }
  });

  test.skip('should be not load valuesets already cached unless forced', async () => {
    const mockRequest = nock('http://terminology.hl7.org/');
    mockRequest.get('/ValueSet/yes-no-unknown-not-asked').reply(200, JSON.stringify(valueSet));
    try {
      const valueSets = client.collectQuestionnaireValuesets(questionnaire);
      valueSets.forEach(async vs => {
        expect(await client.isCached(vs)).toBeFalsy();
      });

      const cached = await client.cacheQuestionnaireItems(questionnaire);

      valueSets.forEach(async vs => {
        expect(await client.isCached(vs)).toBeTruthy();
      });

      const vs = valueSets.values().next().value;
      let update = await client.downloadAndCacheValueset(vs);
      expect(update.get('cached')).toBeFalsy();

      mockRequest.get('/ValueSet/yes-no-unknown-not-asked').reply(200, JSON.stringify(valueSet));
      update = await client.downloadAndCacheValueset(vs, true);

      expect(update.get('cached')).toBeTruthy();
    } finally {
      mockRequest.done();
    }
  });

  test.skip('should be able to handle errors downloading valuesests', async () => {
    const mockRequest = nock('http://terminology.hl7.org/');
    mockRequest.get('/ValueSet/yes-no-unknown-not-asked').reply(404, '');

    const valueSets = client.collectQuestionnaireValuesets(questionnaire);
    valueSets.forEach(async vs => {
      expect(await client.isCached(vs)).toBeFalsy();
    });

    try {
      const err = await client.downloadAndCacheValueset(
        'http://terminology.hl7.org/ValueSet/yes-no-unknown-not-asked'
      );
      expect(err.get('error')).toBeDefined();
    } finally {
      mockRequest.done();
    }
  });

  test('Should not attempt tp download non-vsac valuesets if configured to do so', async () => {
    client.onlyVsac = true;
    const err = await client.downloadAndCacheValueset('http://localhost:9999/vs/1234');
    expect(err.get('error')).toEqual(
      'Cannot download non vsac valuesets: http://localhost:9999/vs/1234'
    );
  });
});
