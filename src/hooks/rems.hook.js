const { kebabCase } = require('lodash');

const definition = {
  hook: 'order-sign',
  name: 'REMS Requirement Lookup',
  description: 'REMS Requirement Lookup',
  id: 'rems-order-sign',
  prefetch: {
    patient: 'Patient/{{context.patientId}}',
    request: 'MedicationRequest?_id={{context.draftOrders.MedicationRequest.id}}',
    practitioner: 'Practitioner/{{context.userId}}'
  }
};

const sourceLabel = 'MCODE REMS Administrator Prototype';
const sourceUrl = 'https://github.com/mcode/REMS';

function buildErrorCard(reason) {
  console.log(reason);
  let cards = {
    cards: [
      {
        summary: 'Bad Request',
        detail: reason,
        source: {
          label: sourceLabel,
          url: sourceUrl
        },
        indicator: 'warning'
      }
    ]
  };
  return cards;
}

const handler = (req, res) => {
  console.log('REMS order-sign hook');
  try {
    const context = req.body.context;
    const contextRequest = context.draftOrders.entry[0];
    const prefetch = req.body.prefetch;
    const patient = prefetch.patient;
    const prefetchRequest = prefetch.request;
    const practitioner = prefetch.practitioner;
    const npi = practitioner.identifier[0].value;

    console.log('    MedicationRequest: ' + prefetchRequest.id);
    console.log('    Practitioner: ' + practitioner.id + ' NPI: ' + npi);
    console.log('    Patient: ' + patient.id);

    // verify a MedicationRequest was sent
    if (contextRequest.resourceType !== 'MedicationRequest') {
      res.json(buildErrorCard('DraftOrders does not contain a MedicationRequest'));
      return;
    }

    // verify ids
    if (patient.id.replace('Patient/', '') !== context.patientId.replace('Patient/', '')) {
      res.json(buildErrorCard('Context patientId does not match prefetch Patient ID'));
      return;
    }
    if (
      practitioner.id.replace('Practitioner/', '') !== context.userId.replace('Practitioner/', '')
    ) {
      res.json(buildErrorCard('Context userId does not match prefetch Practitioner ID'));
      return;
    }
    if (
      prefetchRequest.id.replace('MedicationRequest/', '') !==
      contextRequest.id.replace('MedicationRequest/', '')
    ) {
      res.json(buildErrorCard('Context draftOrder does not match prefetch MedicationRequest ID'));
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

module.exports = { definition, handler };
