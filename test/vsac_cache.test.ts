import VsacCache from '../src/lib/vsac_cache';
import libraryJson from './fixtures/library.json';
import questionnaire from './fixtures/questionnaire.json';
import nock from 'nock';
import ValueSetModel from '../src/lib/schemas/resources/ValueSet';
import { expect } from 'chai';
import { Library } from 'fhir/r4';

const library: Library = JSON.parse(JSON.stringify(libraryJson));
const generateValueset = (idOrUrl: string) => {
  return { resourceType: 'ValueSet', id: idOrUrl };
};
describe('VsacCache', () => {
  const client = new VsacCache('./tmp', '2c1d55c3-3484-4902-b645-25f3a4974ce6');

  beforeEach(async () => {
    await ValueSetModel.deleteMany({});
    client.onlyVsac = false;
  });

  // need to mock the server endpoints to we do not require hitting
  // the server for CI testing with someones api credentials

  it('should be able to collect valueset references from Library Resources', async () => {
    const valueSets = client.collectLibraryValueSets(library);
    expect(valueSets).to.deep.equal(
      new Set([
        'http://cts.nlm.nih.gov/fhir/ValueSet/2.16.840.1.113762.1.4.1219.85',
        'http://cts.nlm.nih.gov/fhir/ValueSet/2.16.840.1.113762.1.4.1219.35'
      ])
    );
  });

  it('should be able to collect valueset references from Questionnaire Resources', async () => {
    const valueSets = client.collectQuestionnaireValueSets(questionnaire);
    expect(valueSets).to.deep.equal(
      new Set(['http://terminology.hl7.org/ValueSet/yes-no-unknown-not-asked'])
    );
  });

  it('should be able to cache ValueSets in Library Resources', async function () {
    const mockRequest = nock('http://cts.nlm.nih.gov/fhir');

    mockRequest
      .get('/ValueSet/2.16.840.1.113762.1.4.1219.85/$expand')
      .reply(200, generateValueset('2.16.840.1.113762.1.4.1219.85'));
    mockRequest
      .get('/ValueSet/2.16.840.1.113762.1.4.1219.35/$expand')
      .reply(200, generateValueset('2.16.840.1.113762.1.4.1219.35'));

    const valueSets = client.collectLibraryValueSets(library);
    valueSets.forEach(async function (vs) {
      expect(await client.isCached(vs)).to.be.false;
    });

    try {
      await client.cacheLibrary(library);
      valueSets.forEach(async vs => {
        expect(await client.isCached(vs)).to.be.true;
      });
    } finally {
      mockRequest.done();
    }
  });

  it('should be able to cache ValueSet in Questionnaire Resources', async () => {
    const mockRequest = nock('http://terminology.hl7.org/');
    mockRequest
      .get('/ValueSet/yes-no-unknown-not-asked')
      .reply(200, generateValueset('yes-no-unknown-not-asked'));

    const valueSets = client.collectQuestionnaireValueSets(questionnaire);
    valueSets.forEach(async vs => {
      expect(await client.isCached(vs)).to.be.false;
    });
    try {
      await client.cacheQuestionnaireItems(questionnaire);
      valueSets.forEach(async vs => {
        expect(await client.isCached(vs)).to.be.true;
      });
    } finally {
      mockRequest.done();
    }
  });

  it.skip('should be not load ValueSets already cached unless forced', async () => {
    const mockRequest = nock('http://terminology.hl7.org');
    const vs = 'http://terminology.hl7.org/ValueSet/yes-no-unknown-not-asked';

    mockRequest
      .get('/ValueSet/yes-no-unknown-not-asked')
      .reply(200, generateValueset('yes-no-unknown-not-asked'));
    try {
      client.collectQuestionnaireValueSets(questionnaire);
      expect(await client.isCached(vs)).to.be.false;

      await client.downloadAndCacheValueSet(vs);
      expect(await client.isCached(vs)).to.be.true;

      mockRequest
        .get('/ValueSet/yes-no-unknown-not-asked')
        .reply(200, generateValueset('yes-no-unknown-not-asked'));
      let update = await client.downloadAndCacheValueSet(vs);

      expect(update).to.be.undefined;

      mockRequest
        .get('/ValueSet/yes-no-unknown-not-asked')
        .reply(200, generateValueset('yes-no-unknown-not-asked'));
      update = await client.downloadAndCacheValueSet(vs, true);

      expect(update).to.be.true;
    } finally {
      mockRequest.done();
    }
  });

  it('should be able to handle errors downloading ValueSets', async () => {
    const mockRequest = nock('http://terminology.hl7.org/');
    const vs = 'http://terminology.hl7.org/ValueSet/yes-no-unknown-not-asked';
    mockRequest.get('/ValueSet/yes-no-unknown-not-asked').reply(404, '');
    expect(await client.isCached(vs)).to.be.null;
    let err;
    try {
      err = await client.downloadAndCacheValueSet(vs);

      expect(err).to.be.undefined;
    } catch (e) {
      console.log('Expected Error to be defined', err);
      throw e;
    } finally {
      mockRequest.done();
    }
  });

  it('Should not attempt to download non-vsac ValueSets if configured to do so', async () => {
    client.onlyVsac = true;
    const err = await client.downloadAndCacheValueSet('http://localhost:9999/vs/1234');
    expect(err).to.be.undefined;
  });
});
