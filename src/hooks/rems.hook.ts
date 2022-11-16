import Card from '../cards/Card'
import ErrorCard from '../cards/ErrorCard'
import OrderSign from './OrderSign';
import OrderSignRequest from './OrderSignRequest';
import OrderSignPrefetch from './Prefetch/OrderSignPrefetch';

interface TypedRequestBody extends Express.Request {
  body: OrderSignRequest
}

const prefetch: OrderSignPrefetch = {
  patient: 'Patient/{{context.patientId}}',
  request:'MedicationRequest?_id={{context.draftOrders.MedicationRequest.id}}',
  practitioner: 'Practitioner/{{context.userId}}'
}
const definition = new OrderSign('rems-order-sign', 'order-sign', 'REMS Requirement Lookup', 'REMS Requirement Lookup', prefetch)

const sourceLabel = 'MCODE REMS Administrator Prototype';
const sourceUrl = 'https://github.com/mcode/REMS';

function buildErrorCard(reason: string) {
  console.log(reason);
  const errorCard = new ErrorCard("Bad Request", reason, sourceLabel, sourceUrl, "warning")
  let cards = {
    cards: [
      errorCard.card
    ],
  };
  return cards;
}

const handler = (req: TypedRequestBody, res: any) => {
  console.log("REMS order-sign hook")
  try {
    const context = req.body.context;
    const contextRequest = context?.draftOrders?.entry?.[0].resource;
    const prefetch = req.body.prefetch;
    const patient = prefetch.patient;
    const prefetchRequest = prefetch.request;
    const practitioner = prefetch.practitioner;
    const npi = prefetch.practitioner.identifier

    const apo = practitioner?.identifier?.[0].value // null checking using ? operator

    console.log('    MedicationRequest: ' + prefetchRequest.id);
    console.log('    Practitioner: ' + practitioner.id + ' NPI: ' + npi);
    console.log('    Patient: ' + patient.id);

    // verify a MedicationRequest was sent
    if (contextRequest && contextRequest.resourceType !== "MedicationRequest") {
      res.json(buildErrorCard("DraftOrders does not contain a MedicationRequest"));
      return;
    }

    // verify ids
    if (patient.id && patient.id.replace('Patient/','') !== context.patientId.replace('Patient/','')) {
      res.json(buildErrorCard("Context patientId does not match prefetch Patient ID"));
      return;
    }
    if (practitioner.id && practitioner.id.replace('Practitioner/','') !== context.userId.replace('Practitioner/','')) {
      res.json(buildErrorCard("Context userId does not match prefetch Practitioner ID"));
      return;
    }
    if ((prefetchRequest.id && contextRequest && contextRequest.id) && prefetchRequest.id.replace('MedicationRequest/','') !== contextRequest.id.replace('MedicationRequest/','')) {
      res.json(buildErrorCard("Context draftOrder does not match prefetch MedicationRequest ID"));
      return;
    }

    const text = `REMS required for Patient ${patient.id}`;

    let cards = {
      cards: [
        {
          summary: `Summary: ${text}`,
          detail: `Detail: ${text}`,
          source: {
            label: sourceLabel,
            url: sourceUrl
          },
          indicator: 'info'
        }
      ]
    };
    res.json(cards);
  } catch (error) {
    console.log(error);
    res.json(buildErrorCard('Unknown Error'));
  }
};

export { definition, handler };
