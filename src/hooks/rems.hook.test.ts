import OrderSign from './OrderSign';
import getREMSHook from './rems.hook';
import {expect} from 'chai';

describe('hook: test rems', () => {
  it('should have definition and handler', () => {
    const prefetch = {
      patient: 'Patient/{{context.patientId}}',
      practitioner: 'Practitioner/{{context.userId}}'
    };
    const expectedDefinition = new OrderSign(
      'rems-order-sign',
      'order-sign',
      'REMS Requirement Lookup',
      'REMS Requirement Lookup',
      prefetch
    );

    expect(getREMSHook).to.haveOwnProperty('definition');
    expect(getREMSHook).to.haveOwnProperty('handler');

    expect(getREMSHook.definition).to.deep.equal(expectedDefinition);
    expect(getREMSHook.handler).to.instanceOf(Function);
  });
});
