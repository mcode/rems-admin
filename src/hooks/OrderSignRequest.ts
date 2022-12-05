import { Bundle } from 'fhir/r4';
import { Url } from 'url';
import OrderSignRequestPrefetch from './Prefetch/OrderSignRequestPrefetch';
// https://cds-hooks.hl7.org/1.0/#fhir-resource-access
interface FhirAuthorization {
  token_type: string;
  expires_in: number;
  scope: string;
  subject: string;
}
// https://cds-hooks.org/hooks/order-sign/#context
interface OrderSignContext {
  userId: string;
  patientId: string;
  encounterId?: string;
  draftOrders: Bundle;
}
// https://cds-hooks.hl7.org/1.0/#calling-a-cds-service
export default interface OrderSignRequest {
  hook: string;
  hookInstance: string;
  fhirServer: Url;
  fhirAuthorization: FhirAuthorization;
  context: OrderSignContext;
  prefetch: OrderSignRequestPrefetch;
}
