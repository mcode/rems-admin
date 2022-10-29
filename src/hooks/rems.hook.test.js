const getREMSHook = require('./rems.hook');

describe('hook: test rems', () => {
  test('should have definition and handler', () => {
    const expectedDefinition = {
      hook: 'order-sign',
      name: 'REMS Requirement Lookup',
      description: 'REMS Requirement Lookup',
      id: 'rems-order-sign',
      prefetch: {
        patient: 'Patient/{{context.patientId}}',
        request:'MedicationRequest?_id={{context.draftOrders.MedicationRequest.id}}',
        practitioner: 'Practitioner/{{context.userId}}'
      },
    };
    expect(getREMSHook).toHaveProperty('definition');
    expect(getREMSHook).toHaveProperty('handler');

    expect(getREMSHook.definition).toStrictEqual(expectedDefinition);
    expect(getREMSHook.handler).toBeInstanceOf(Function);
  });
  test('should test the logic of handler', () => {});
});
