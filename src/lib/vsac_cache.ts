import axios from 'axios';
import fhirpath from 'fhirpath';
import fs from 'fs';
import { stringify } from 'querystring';

class VsacCache {

  cacheDir: string;
  apiKey: string;
  baseUrl: string;
  onlyVsac: boolean;

  constructor(cacheDir: string, apiKey: string, baseUrl = 'http://cts.nlm.nih.gov/fhir/', onlyVsac = false) {
    this.cacheDir = cacheDir;
    this.apiKey = apiKey;
    this.baseUrl = baseUrl;
    this.onlyVsac = onlyVsac;
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
    let valuesets = new Set<string>()
    items.forEach(async (item: any) => {
      if (item.answerValueSet) {
        valuesets.add(item.answerValueSet)
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
    const values = Array.from(valueSets)
    const results = new Map<string, any>();
    return await Promise.all(values.map(async vs => {
      return results.set(vs, await this.downloadAndCacheValueset(vs, forceReload));
    }));
  }

  /**
   * 
   * @param connonical the Url to download 
   * @param forceReload  flag to force recaching already cached values
   * @returns Map that contains results url: {cached, valueSet, error}
   */
  async downloadAndCacheValueset(connonical: string, forceReload = false) {
    if (forceReload || !(this.isCached(connonical))) {
      const vs = await this.downloadValueset(connonical);
      if (vs.get("error")) {
        console.log("Error Downloading ", connonical)
        console.log(vs.get("error").message);
      }
      else if (vs.get("valueSet")) {
        this.storeValueSet(connonical, vs.get("valueSet"));
        vs.set("cached", true);
      }
      return vs;
    }
    const ret = new Map<string, any>();
    ret.set("cached", false);
    return ret;
  }

  /**
   * 
   * @param connonical the url to download 
   * @returns Map that contains results url: {valueset, error}
   */
  async downloadValueset(connonical: string) {
    const retValue = new Map<string, any>();
    const headers: any = {
      "Accept": "application/json+fhir"
    };
    let isVsac = false;
    // this will only add headers to vsac urls
    if (connonical.startsWith(this.baseUrl)) {
      headers['Authorization'] = "Basic " + Buffer.from(':' + this.apiKey).toString('base64');
      isVsac = true;
    }
    // this will try to download valuesets that are not in vsac as well based on the 
    // connonical url passed in. 
    let url = connonical;
    if (connonical.startsWith(this.baseUrl)) {
      url = url + "/$expand";
    }
    // axios cleanup 
    await process.nextTick(() => { });
    if ((this.onlyVsac && isVsac) || !this.onlyVsac) {
      try {
        console.log("Downloading vs " + url)
        const vs = await axios.get(url, {
          headers: headers
        });
        retValue.set("valueSet", vs.data);
      } catch (error: any) {
        retValue.set("error", error)
      }
    }else{
      retValue.set("error", "Cannot download non vsac valuesets: "+ url);
    }

    return retValue;
  }

  /**
   * 
   * @param connonical url to test if already cached
   * @returns true or false
   */
  isCached(connonical: string) {
    const fileName = this.getCacheName(connonical)
    return fs.existsSync(fileName);
  }

  /**
   * 
   * @param connonical url key to cache
   * @param vs the valueset to cache
   */
  storeValueSet(connonical: string, vs: any) {
    const fileName = this.getCacheName(connonical)
    fs.writeFileSync(fileName, JSON.stringify(vs));
  }

  /**
   * 
   * @param connonical the url to cache
   * @returns identifier used to cache the vs
   */
  getCacheName(connonical: string) {
    const url = new URL(connonical);
    let parts = url.pathname.split("/")
    return `${this.cacheDir}/${parts[parts.length - 1]}`;
  }

  /**
   * Clear all of the cached valuesets 
   */
  clearCache() {
    try {
      let files = fs.readdirSync(this.cacheDir)
      files.map(file => fs.unlinkSync(`${this.cacheDir}/${file}`))

    } catch (err) {
      console.log(err);
    }
  }
}

export default VsacCache;