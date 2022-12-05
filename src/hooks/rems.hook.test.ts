import OrderSign from './OrderSign';
import getREMSHook from './rems.hook';

describe('hook: test rems', () => {
  test('should have definition and handler', () => {
    const prefetch = {
      patient: 'Patient/{{context.patientId}}',
      request: 'MedicationRequest?_id={{context.draftOrders.MedicationRequest.id}}',
      practitioner: 'Practitioner/{{context.userId}}'
    };
    const expectedDefinition = new OrderSign(
      'rems-order-sign',
      'order-sign',
      'REMS Requirement Lookup',
      'REMS Requirement Lookup',
      prefetch
    );

    expect(getREMSHook).toHaveProperty('definition');
    expect(getREMSHook).toHaveProperty('handler');

    expect(getREMSHook.definition).toStrictEqual(expectedDefinition);
    expect(getREMSHook.handler).toBeInstanceOf(Function);
  });
});
