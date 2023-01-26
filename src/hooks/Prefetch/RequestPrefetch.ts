import { Resource } from 'fhir/r4';

export default interface RequestPrefetch {
  [key: string]: Resource | undefined;
}
