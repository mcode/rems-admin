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
   * @param library The library to cache valuesets for
   * @param forceReload flag to force reaching valuesets already cached
   * @returns Map of caching results url: {valueSet, error, cached}
   */
  async cacheLibrary(library: Library, forceReload = false) {
    const valueSets = this.collectLibraryValuesets(library);
    return await this.cacheValuesets(valueSets, forceReload);
  }

  /**
   *
   * @param obj Questionnaire|item object to cache valuesets for
   * @param forceReload flag to force reaching valuesets already cached
   * @returns Map of caching results url: {valueSet, error, cached}
   */

  async cacheQuestionnaireItems(obj: any, forceReload = false) {
    const valueSets = this.collectQuestionnaireValuesets(obj);
    return await this.cacheValuesets(valueSets, forceReload);
  }

  /**
   *
   * @param library The fhir Library to download valuesets from
   * @returns a Set that includes all of the valueset urls found in the Library
   */
  collectLibraryValuesets(library: Library) {
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
    const results: ValueSet[] = [];
    await Promise.all(
      values.map(async vs => {
        const vsResource = await this.downloadAndCacheValueset(vs, forceReload);
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
   * @returns Map that contains results url: {cached, valueSet, error}
   */
  async downloadAndCacheValueset(idOrUrl: string, forceReload = false) {
    const isVsCached = await this.isCached(idOrUrl);
    if (forceReload || !isVsCached) {
      const vs = await this.downloadValueset(idOrUrl);
      if (vs.error) {
        console.log('Error Downloading ', idOrUrl, typeof vs.error);
      } else if (vs.valueSet) {
        await this.storeValueSet(this.getValuesetId(idOrUrl), vs.valueSet);
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
   * @returns Map that contains results url: {valueset, error}
   */
  async downloadValueset(idOrUrl: string) {
    const retValue: ValueSetMapEntry = {};
    const vsUrl = this.gtValuesetURL(idOrUrl);
    const headers: any = {
      Accept: 'application/json+fhir'
    };
    let isVsac = false;
    // this will only add headers to vsac urls
    const isBaseUrlVsac = this.baseUrl.find(str => vsUrl.startsWith(str));
    if (isBaseUrlVsac) {
      headers['Authorization'] = 'Basic ' + Buffer.from('apikey:' + this.apiKey).toString('base64');
      isVsac = true;
    }
    // this will try to download valuesets that are not in vsac as well based on the
    // connonical url passed in.
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
      retValue.error = 'Cannot download non vsac valuesets: ' + url;
    }

    return retValue;
  }

  /**
   *
   * @param idOrUrl url to test if already cached
   * @returns true or false
   */
  async isCached(idOrUrl: string): Promise<ValueSet | null | undefined> {
    const id = this.getValuesetId(idOrUrl);
    // Query our collection for this observation
    return await ValueSetModel.findOne({ id: id.toString() });
    // return await new Promise<ValueSet | null>((resolve, _reject) => {
    //   if (id) {
    //     ValueSetModel.findOne({ id: id.toString() })
    //       .exec()
    //       .then((valueSet: any) => {
    //         if (valueSet) {
    //           resolve(valueSet);
    //         }
    //         resolve(null);
    //       });
    //   } else {
    //     resolve(null);
    //   }
    // });
  }

  /**
   * Stores a valueset in the cache.  This currently only works for new inserts and will not update
   * any resources currently cached.  This will be updated with a move to Mongo.
   * @param vs the valueset to cache
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
    let path = `${this.baseUrl[0]}/ValueSet/${idOrUrl}`;
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
      ValueSetModel.collection.drop();
    } catch (e) {
      console.error(e);
    }
  }
}

export default VsacCache;
