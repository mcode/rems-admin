import OrderSignRequest from '../../OrderSignRequest';
import OrderSignPrefetch from '../OrderSignPrefetch';
import axios from 'axios'
function jsonPath(json: any, path: string) {
  // Use a regular expression to find array accessors in the form of "[i]"
  const arrayRegex = /\[(\d+)\]/g;

  // Use the regex to find all the array accessors in the path
  let match;
  while ((match = arrayRegex.exec(path)) !== null) {
    // Get the index of the array element to access
    const index = match[1];

    // Use the index to replace the array accessor in the path with the corresponding property accessor
    path = path.replace(match[0], `.${index}`);
  }

  // Split the path into its individual components
  const pathComponents = path.split('.');

  // Use reduce to iterate over the path components and get the corresponding value from the JSON object
  return pathComponents.reduce((obj, key) => {
    // If the key doesn't exist, return undefined
    if (!obj || !Object.prototype.hasOwnProperty.call(obj, key)) return undefined;

    // Otherwise, return the value at the key
    return obj[key];
  }, json);
}
function replaceTokens(str: string, json: any): string {
  // Use a regular expression to find tokens in the form of "{{token}}"
  const tokenRegex = /{{([\w.]+)}}/g;

  // Use the regex to find all the tokens in the string
  let match;
  while ((match = tokenRegex.exec(str)) !== null) {
    // Get the token from the match
    const token = match[1];

    // Use the token to get the corresponding value from the JSON object
    const value = jsonPath(json, token);

    // Replace the token in the original string with the value
    str = str.replace(match[0], value);
  }

  // Return the modified string
  return str;
}
function resolveToken(token: string, context: OrderSignRequest) {
  const fulfilledToken = replaceTokens(token, context);
  const ehrUrl = `${context.fhirServer}/${fulfilledToken}`;
  const access_token = context.fhirAuthorization.access_token;
  const options = {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${access_token}`
    }
  };
  const response = axios(ehrUrl, options);
  return response.then(e => {
    return e.data;
  });
}
function hydrate(template: OrderSignPrefetch, request: OrderSignRequest) {
  let prefetch = request.prefetch;
  if (!prefetch) {
    prefetch = {};
  }
  // Find unfulfilled prefetch elements and resolve them using
  // the defined prefetch template
  const promises = Object.keys(template).map(key => {
    if (!Object.prototype.hasOwnProperty.call(prefetch, key)) {
      // prefetch was not fulfilled
      return resolveToken(template[key], request).then(data => {
        Object.assign(prefetch, { [key]: data });
      });
    }
  });

  return Promise.all(promises).then(() => prefetch);
}
export { hydrate };
