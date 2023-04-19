import { CdsService } from '../rems-cds-hooks/resources/CdsService';
import { SupportedHooks } from '../rems-cds-hooks/resources/HookTypes';
import getREMSHook from './rems.hook';

describe('hook: test rems', () => {
  test('should have definition and handler', () => {
    const prefetch = {
      patient: 'Patient/{{context.patientId}}',
      practitioner: '{{context.userId}}'
    };
    const expectedDefinition: CdsService = {
      id: 'rems-order-sign',
      hook: SupportedHooks.ORDER_SIGN,
      title: 'REMS Requirement Lookup',
      description: 'REMS Requirement Lookup',
      prefetch: prefetch
    };

    expect(getREMSHook).toHaveProperty('definition');
    expect(getREMSHook).toHaveProperty('handler');

    expect(getREMSHook.definition).toStrictEqual(expectedDefinition);
    expect(getREMSHook.handler).toBeInstanceOf(Function);
  });
});
