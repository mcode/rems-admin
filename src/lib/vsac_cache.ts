import axios from 'axios';
import fhirpath from 'fhirpath';
import fs from 'fs';
import { stringify } from 'querystring';
import { FhirUtilities } from '../fhir/utilities';
import { Globals } from '../globals';
import constants from '../constants';
class VsacCache {
  cacheDir: string;
  apiKey: string;
  baseUrl: string;
  onlyVsac: boolean;
  base_version: string;

  constructor(
    cacheDir: string,
    apiKey: string,
    baseUrl = 'http://cts.nlm.nih.gov/fhir/',
    onlyVsac = false,
    base_version = '4_0_0'
  ) {
    this.cacheDir = cacheDir;
    this.apiKey = apiKey;
    this.baseUrl = baseUrl;
    this.onlyVsac = onlyVsac;
    this.base_version = base_version;
  }

  /**
   *
   * @param library The library to cache valuesets for
   * @param forceReload flag to force reaching valuesets already cached
   * @returns Map of caching results url: {valueSet, error, cached}
   */
  async cacheLibrary(library: any, forceReload = false) {
    const valueSets = this.collectLibraryValuesets(library);
    return await this.cacheValuesets(valueSets);
  }

  /**
   *
   * @param obj Questionnaire|item object to cache valuesets for
   * @param forceReload flag to force reaching valuesets already cached
   * @returns Map of caching results url: {valueSet, error, cached}
   */

  async cacheQuestionnaireItems(obj: any, forceReload = false) {
    const valueSets = this.collectQuestionnaireValuesets(obj);
    return await this.cacheValuesets(valueSets);
  }

  /**
   *
   * @param library The fhir Library to download valuesets from
   * @returns a Set that includes all of the valueset urls found in the Library
   */
  collectLibraryValuesets(library: any) {
    // ensure only unique values
    return new Set(fhirpath.evaluate(library, 'Library.dataRequirement.codeFilter.valueSet'));
  }

  /**
   *
   * @param obj the Questionnaire object or item to collect answerValueSet urls from
   * @returns a Set that includes all of the valuesets in the passed object.  This returns values for sub items as well
   */
  collectQuestionnaireValuesets(obj: any) {
    const items = obj.item;
    let valuesets = new Set<string>();
    items.forEach(async (item: any) => {
      if (item.answerValueSet) {
        valuesets.add(item.answerValueSet);
      }
      if (item.item) {
        valuesets = new Set<string>([...valuesets, ...this.collectQuestionnaireValuesets(item)]);
      }
    });
    // ensure only unique values
    return valuesets;
  }

  /**
   *
   * @param valueSets The valusets to cache
   * @param forceReload flag to force downloading and caching of the valuesets
   * @returns a Map with the return values from caching the valuesets.
   */
  async cacheValuesets(valueSets: Set<string> | [], forceReload = false) {
    const values = Array.from(valueSets);
    const results = new Map<string, any>();
    return await Promise.all(
      values.map(async vs => {
        return results.set(vs, await this.downloadAndCacheValueset(vs, forceReload));
      })
    );
  }

  /**
   *
   * @param idOrUrl the Url to download
   * @param forceReload  flag to force recaching already cached values
   * @returns Map that contains results url: {cached, valueSet, error}
   */
  async downloadAndCacheValueset(idOrUrl: string, forceReload = false) {
    if (forceReload || !(await this.isCached(idOrUrl))) {
      const vs = await this.downloadValueset(idOrUrl);
      if (vs.get('error')) {
        console.log('Error Downloading ', idOrUrl);
        console.log(vs.get('error').message);
      } else if (vs.get('valueSet')) {
        await this.storeValueSet(this.getValuesetId(idOrUrl), vs.get('valueSet'));
        vs.set('cached', true);
      }
      return vs;
    }
    const ret = new Map<string, any>();
    ret.set('cached', false);
    return ret;
  }

  /**
   *
   * @param idOrUrl the url to download
   * @returns Map that contains results url: {valueset, error}
   */
  async downloadValueset(idOrUrl: string) {
    const retValue = new Map<string, any>();
    const vsUrl = this.gtValuesetURL(idOrUrl);
    const headers: any = {
      Accept: 'application/json+fhir'
    };
    let isVsac = false;
    // this will only add headers to vsac urls
    if (vsUrl.startsWith(this.baseUrl)) {
      headers['Authorization'] = 'Basic ' + Buffer.from(':' + this.apiKey).toString('base64');
      isVsac = true;
    }
    // this will try to download valuesets that are not in vsac as well based on the
    // connonical url passed in.
    let url = vsUrl;
    if (vsUrl.startsWith(this.baseUrl)) {
      url = url + '/$expand';
    }
    // axios cleanup
    await process.nextTick(() => {
      const v = 1;
    });
    if ((this.onlyVsac && isVsac) || !this.onlyVsac) {
      try {
        console.log('Downloading vs ' + url);
        const vs = await axios.get(url, {
          headers: headers
        });
        retValue.set('valueSet', vs.data);
      } catch (error: any) {
        retValue.set('error', error);
      }
    } else {
      retValue.set('error', 'Cannot download non vsac valuesets: ' + url);
    }

    return retValue;
  }

  /**
   *
   * @param idOrUrl url to test if already cached
   * @returns true or false
   */
  async isCached(idOrUrl: string) {
    const id = this.getValuesetId(idOrUrl);

    // Grab an instance of our DB and collection
    const db = Globals.database;
    const collection = db.collection(`${constants.COLLECTION.VALUESET}_${this.base_version}`);
    // Query our collection for this observation
    return await new Promise((resolve, reject) => {
      collection.findOne({ id: id }, (err: any, valueSet: any) => {
        if (err) {
          console.log('Error with ValueSet.searchById: ', err);
          reject(err);
        }
        if (valueSet) {
          resolve(valueSet);
        }
        resolve(null);
      });
    });
  }

  /**
   * Stores a valueset in the cache.  This currently only works for new inserts and will not update
   * any resources currently cached.  This will be updated with a move to Mongo.
   * @param vs the valueset to cache
   */
  async storeValueSet(id: string, vs: any) {
    if (!vs.id) {
      vs.id = id;
    }
    await new Promise((resolve, reject) => FhirUtilities.store(vs, resolve, reject));
  }

  /**
   *
   * @param idOrUrl the url to cache
   * @returns identifier used to cache the vs
   */
  getValuesetId(idOrUrl: string) {
    // is this a url or an id
    if (idOrUrl.startsWith('http://') || idOrUrl.startsWith('https://')) {
      const url = new URL(idOrUrl);
      const parts = url.pathname.split('/');
      return parts[parts.length - 1];
    }
    return idOrUrl;
  }

  /**
   *
   * @param idOrUrl the url to cache
   * @returns identifier used to cache the vs
   */
  gtValuesetURL(idOrUrl: string) {
    // is this a url or an id
    if (idOrUrl.startsWith('http://') || idOrUrl.startsWith('https://')) {
      return idOrUrl;
    }
    let path = `${this.baseUrl}/ValueSet/${idOrUrl}`;
    path = path.replace('//', '/');
    return path;
  }
  /**
   * Clear all of the cached valuesets
   * This currently does not work since merging and updating to use tingo.  Drop collection in tingo is broken
   *
   */
  clearCache() {
    // drop the collection
    try {
      const db = Globals.database;
      const collection = db.collection(`${constants.COLLECTION.VALUESET}_${this.base_version}`);
      if (collection) {
        collection.drop(console.log);
        const history_collection = db.collection(
          `${constants.COLLECTION.VALUESET}_${this.base_version}_History`
        );
        if (history_collection) {
          history_collection.drop(console.log);
        }
      }
    } catch (e) {
      console.error(e);
    }
  }
}

export default VsacCache;
