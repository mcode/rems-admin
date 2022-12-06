
import VsacCache from '../vsac_cache';
import library from './fixtures/library.json';
import questionnaire from './fixtures/questionnaire.json';
describe('VsacCache', () => {

  let client = new VsacCache('./tmp', process.env["VSAC_API_KEY"] ?? "2c1d55c3-3484-4902-b645-25f3a4974ce6");
  beforeEach(() => {
    jest.resetModules();
  });

  // need to mock the server endpoints to we do not require hitting 
  // the server for CI testing with someones api credentials 

  test('should be able to collect valueset references from Library Resources', async () => {
    let valueSets = client.collectLibraryValuesets(library);
    expect(valueSets).toEqual(new Set(["http://cts.nlm.nih.gov/fhir/ValueSet/2.16.840.1.113762.1.4.1219.85",
      "http://cts.nlm.nih.gov/fhir/ValueSet/2.16.840.1.113762.1.4.1219.35"]));
  });

  test('should be able to collect valueset references from Questionnaire Resources', async () => {
    let valueSets = client.collectQuestionnaireValuesets(questionnaire);
    expect(valueSets).toEqual(new Set(["http://terminology.hl7.org/ValueSet/yes-no-unknown-not-asked"]));
  });

  test('should be able to cache valuesets in Library Resources', async () => {
    client.clearCache();
    const valueSets = client.collectLibraryValuesets(library);
    valueSets.forEach(vs => {
      expect(client.isCached(vs)).toBeFalsy();
    });

    await client.cacheLibrary(library);

    valueSets.forEach(vs => {
      expect(client.isCached(vs)).toBeTruthy();
    });
  });

  test('should be able to cache valuesets in Questionnaire Resources', async () => {
    client.clearCache();
    const valueSets = client.collectQuestionnaireValuesets(questionnaire);
    valueSets.forEach(vs => {
      expect(client.isCached(vs)).toBeFalsy();
    });

    await client.cacheQuestionnaireItems(questionnaire);

    valueSets.forEach(vs => {
      expect(client.isCached(vs)).toBeTruthy();
    });
  });


  test('should be not load valuesets already cached unless forced', async () => {
    client.clearCache();
    const valueSets = client.collectQuestionnaireValuesets(questionnaire);
    valueSets.forEach(vs => {
      expect(client.isCached(vs)).toBeFalsy();
    });

    let cached = await client.cacheQuestionnaireItems(questionnaire);

    valueSets.forEach(vs => {
      expect(client.isCached(vs)).toBeTruthy();
    });

    const vs = valueSets.values().next().value;
    let update = await client.downloadAndCacheValueset(vs);
    expect(update.get("cached")).toBeFalsy();

    update = await client.downloadAndCacheValueset(vs, true);
    expect(update.get("cached")).toBeTruthy();

  });

  test("Should be able to handle errors downloading valuesets", async () => {
    client.clearCache();
    const err = await client.downloadAndCacheValueset("http://localhost:9999/vs/1234");
    expect(err.get("error")).toBeDefined();

  })



});