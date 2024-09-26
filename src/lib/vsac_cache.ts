import axios from 'axios';
import fhirpath from 'fhirpath';
import { FhirUtilities } from '../fhir/utilities';
import ValueSetModel from './schemas/resources/ValueSet';
import { Library, ValueSet } from 'fhir/r4';

interface ValueSetMapEntry {
  valueSet?: ValueSet;
  cached?: boolean;
  error?: any;
}
class VsacCache {
  cacheDir: string;
  apiKey: string;
  baseUrl: string[];
  onlyVsac: boolean;
  base_version: string;

  constructor(
    cacheDir: string,
    apiKey: string,
    baseUrl = ['http://cts.nlm.nih.gov/fhir/', 'https://cts.nlm.nih.gov/fhir/'],
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
   * @param library The library to cache ValueSets for
   * @param forceReload flag to force reaching ValueSets already cached
   * @returns Map of caching results url: {ValueSet, error, cached}
   */
  async cacheLibrary(library: Library, forceReload = false) {
    const valueSets = this.collectLibraryValueSets(library);
    return await this.cacheValueSets(valueSets, forceReload);
  }

  /**
   *
   * @param obj Questionnaire|item object to cache ValueSets for
   * @param forceReload flag to force reaching ValueSets already cached
   * @returns Map of caching results url: {valueSet, error, cached}
   */

  async cacheQuestionnaireItems(obj: any, forceReload = false) {
    const valueSets = this.collectQuestionnaireValueSets(obj);
    return await this.cacheValueSets(valueSets, forceReload);
  }

  /**
   *
   * @param library The fhir Library to download ValueSets from
   * @returns a Set that includes all of the ValueSet urls found in the Library
   */
  collectLibraryValueSets(library: Library) {
    // ensure only unique values
    const result = fhirpath.evaluate(
      library,
      'Library.dataRequirement.codeFilter.valueSet'
    ) as any[];
    return new Set(result);
  }

  /**
   *
   * @param obj the Questionnaire object or item to collect answerValueSet urls from
   * @returns a Set that includes all of the ValueSets in the passed object.  This returns values for sub items as well
   */
  collectQuestionnaireValueSets(obj: any) {
    const items = obj.item;
    let valueSets = new Set<string>();
    items.forEach(async (item: any) => {
      if (item.answerValueSet) {
        valueSets.add(item.answerValueSet);
      }
      if (item.item) {
        valueSets = new Set<string>([...valueSets, ...this.collectQuestionnaireValueSets(item)]);
      }
    });
    // ensure only unique values
    return valueSets;
  }

  /**
   *
   * @param valueSets The ValueSets to cache
   * @param forceReload flag to force downloading and caching of the ValueSets
   * @returns a Map with the return values from caching the ValueSets.
   */
  async cacheValueSets(valueSets: Set<string> | [], forceReload = false) {
    const values = Array.from(valueSets);
    const results: ValueSet[] = [];
    await Promise.all(
      values.map(async vs => {
        const vsResource = await this.downloadAndCacheValueSet(vs, forceReload);
        if (vsResource) {
          results.push(vsResource);
        }
      })
    );
    return results;
  }

  /**
   *
   * @param idOrUrl the Url to download
   * @param forceReload  flag to force recaching already cached values
   * @returns Map that contains results url: {cached, ValueSet, error}
   */
  async downloadAndCacheValueSet(idOrUrl: string, forceReload = false) {
    const isVsCached = await this.isCached(idOrUrl);
    if (forceReload || !isVsCached) {
      const vs = await this.downloadValueSet(idOrUrl);
      if (vs.error) {
        console.log('Error Downloading ', idOrUrl, typeof vs.error);
      } else if (vs.valueSet) {
        await this.storeValueSet(this.getValueSetId(idOrUrl), vs.valueSet);
        vs.cached = true;
      }
      return vs.valueSet;
    } else if (isVsCached) {
      return isVsCached; // returns cached resource if available
    }
  }

  /**
   *
   * @param idOrUrl the url to download
   * @returns Map that contains results url: {ValueSet, error}
   */
  async downloadValueSet(idOrUrl: string) {
    const retValue: ValueSetMapEntry = {};
    const vsUrl = this.gtValueSetURL(idOrUrl);
    const headers: any = {
      Accept: 'application/json+fhir'
    };
    let isVsac = false;
    // this will only add headers to vsac urls
    const isBaseUrlVsac = this.baseUrl.find(str => vsUrl.startsWith(str));
    if (isBaseUrlVsac) {
      headers['Authorization'] =
        'Basic ' + Buffer.from('API key:' + this.apiKey).toString('base64');
      isVsac = true;
    }
    // this will try to download ValueSets that are not in vsac as well based on the
    // canonical url passed in.
    let url = vsUrl;
    if (isBaseUrlVsac) {
      url = vsUrl + '/$expand';
    }
    // axios cleanup
    await process.nextTick(() => {
      const v = 1;
      return v;
    });
    if ((this.onlyVsac && isVsac) || !this.onlyVsac) {
      try {
        const vs = await axios.get(url, {
          headers: headers
        });
        retValue.valueSet = vs.data;
      } catch (error: any) {
        retValue.error = error;
      }
    } else {
      retValue.error = 'Cannot download non VSAC ValueSets: ' + url;
    }

    return retValue;
  }

  /**
   *
   * @param idOrUrl url to test if already cached
   * @returns true or false
   */
  async isCached(idOrUrl: string): Promise<ValueSet | null | undefined> {
    const id = this.getValueSetId(idOrUrl);
    // Query our collection for this observation
    return await ValueSetModel.findOne({ id: id.toString() });
  }

  /**
   * Stores a ValueSet in the cache.  This currently only works for new inserts and will not update
   * any resources currently cached.  This will be updated with a move to Mongo.
   * @param vs the ValueSet to cache
   */
  async storeValueSet(id: string, vs: ValueSet) {
    if (!vs.id) {
      vs.id = id;
    }
    return await FhirUtilities.store(vs, ValueSetModel);
  }

  /**
   *
   * @param idOrUrl the url to cache
   * @returns identifier used to cache the vs
   */
  getValueSetId(idOrUrl: string) {
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
  gtValueSetURL(idOrUrl: string) {
    // is this a url or an id
    if (idOrUrl.startsWith('http://') || idOrUrl.startsWith('https://')) {
      return idOrUrl;
    }
    let path = `${this.baseUrl[0]}/ValueSet/${idOrUrl}`;
    path = path.replace('//', '/');
    return path;
  }
  /**
   * Clear all of the cached ValueSets
   * This currently does not work since merging and updating to use TingoDB.  Drop collection in TingoDB is broken
   *
   */
  clearCache() {
    // drop the collection
    try {
      ValueSetModel.collection.drop();
    } catch (e) {
      console.error(e);
    }
  }
}

export default VsacCache;
