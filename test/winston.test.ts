/* eslint @typescript-eslint/no-var-requires: "off" */
/**
 * @NOTE: Reset modules in between tests so we can test the application of an
 * environment based configuration that changes between runs. We need this
 * for full coverage
 */
import container from '../src/lib/winston';
import config from '../src/config';
import { expect } from 'chai';

describe('Logger Class', () => {
  it('setup without daily log file', () => {
    const logger = container.get('application');

    expect(logger).to.not.equal(undefined);
    expect(logger.transports.length).to.equal(1);
    expect(logger.transports[0].level).to.equal(config.logging.level);
  });

  it('setup with daily log file generation', () => {
    // Mock the config to test other branch of if statement
    // jest.mock('../config', () => ({
    //   logging: {
    //     level: 'debug',
    //     directory: 'logs'
    //   }
    // }));
    const containerPromise = import('../src/lib/winston');
    const configPromise = import('../src/config');
    containerPromise.then(container => {
      configPromise.then(config => {
        const logger = container.default.get('application');
        expect(logger).to.not.equal(undefined);
        expect(logger.transports.length).to.equal(2);
        expect(logger.transports[0].level).to.equal(config.default.logging.level);
        expect(logger.transports[1].level).to.equal(config.default.logging.level);
      });
    });
  });
});

export {};
