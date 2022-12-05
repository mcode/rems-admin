import axios from 'axios';
import fhirpath from 'fhirpath';
import fs from 'fs';
class VsacCache {

  cacheDir: string;
  apiKey: string;
  baseUrl: string;

  constructor(cacheDir: string, apiKey: string, baseUrl = 'https://cts.nlm.nih.gov/fhir/') {
    this.cacheDir = cacheDir;
    this.apiKey = apiKey;
    this.baseUrl = baseUrl;
  }


  async cacheLibrary(library: any, forceReload = false) {
    const valueSets = fhirpath.evaluate(library, 'Library.dataRequirements.codeFilter.valueset');
    valueSets.forEach(async vs => {
      await this.downloadAndCacheValueset(vs, forceReload);
    });
  }

  async cacheQuestionnaireItems(obj: any, forceReload = false) {
    const items = obj.item;
    items.forEach(async (item: any) => {
      if (item.answerValueSet) {
        this.downloadAndCacheValueset(item.answerValueSet, forceReload);
      }
      if (item.item) {
        this.cacheQuestionnaireItems(item, forceReload);
      }
    });

  }

  async downloadAndCacheValueset(connonical: string, forceReload = false) {
    console.log('fetching vs ' + connonical);
    if (forceReload || !this.isCached(connonical)) {
      const vs = this.downloadValueset(connonical);
      this.storeValueSet(vs);
      return vs;
    }
  }


  async downloadValueset(connonical: string) {
    console.log('fetching vs ' + connonical);
    const headers: any = {};
    // this will only add headers to vsac urls
    if (connonical.startsWith(this.baseUrl)) {
      headers['AUTHORIZATION'] = Buffer.from(':' + this.apiKey).toString('base64');
    }
    // this will try to download valuesets that are not in vsac as well based on the 
    // connonical url passed in. 
    return await axios.get(connonical, {
      headers: headers
    });
  }

  async isCached(url: string) {
    const id = '';
    const fileName = `${this.cacheDir}/${id}`;
    return fs.existsSync(fileName);
  }

  async storeValueSet(vs: any) {
    if (vs && vs.id) {
      const fileName = `${this.cacheDir}/${vs.id}`;
      fs.writeFileSync(fileName, JSON.stringify(vs));
    }
  }
}

export default VsacCache;