import { Patient, Practitioner } from 'fhir/r4';
import RequestPrefetch from './RequestPrefetch';
export default interface OrderSignRequestPrefetch extends RequestPrefetch {
  patient?: Patient;
  practitioner?: Practitioner;
}
