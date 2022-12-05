
import  VsacCache  from '../lib/vsac_cache';
import library from './fixtures/library.json';
import questionnaire from './fixtures/questionnaire.json'; 
describe('VsacCache', () => {

  let client = new VsacCache('./tmp',process.env.apiKey);
  beforeEach(() => {
    jest.resetModules();

  });

  // need to mock the server endpoints to we do not require hitting 
  // the server for CI testing with someones api credentials 


  test('should be able to cache valuesets in Library Resources', async () => {
    expect(getCacheCount()).toEqual(0);
    await client.cacheLibrary(library);
    expect(getCacheCount()).toEqual(0);
  });

  test('should be able to cache valuesets in Questionnaire Resources', async () => {
    expect(getCacheCount()).toEqual(0);
    await client.cacheLibrary(questionnaire);
    expect(getCacheCount()).toEqual(0);
  });


  test('should be able to force reload of valuesets', async () => {
    expect(getCacheCount()).toEqual(0);
    await client.cacheLibrary(library, true);
    expect(getCacheCount()).toEqual(0);
  });

  test('should be not load valuesets already cached', async () => {
    expect(getCacheCount()).toEqual(0);
    await client.cacheLibrary(library, true);
    expect(getCacheCount()).toEqual(0);
    await client.cacheLibrary(library, true);
  });


});