/* eslint @typescript-eslint/no-var-requires: "off" */
/**
 * @NOTE: Reset modules in between tests so we can test the application of an
 * environment based configuration that changes between runs. We need this
 * for full coverage
 */
import container from './winston';
import config from '../config';
import winston, { Container, transport, transports } from 'winston';

describe('Logger Class', () => {
  beforeEach(() => {
    jest.resetModules();
  });

  test('setup without daily log file', () => {
    const logger = container.get('application');

    expect(logger).toBeDefined();
    expect(logger.transports).toHaveLength(1);
    expect(logger.transports[0].level).toBe(config.logging.level);
  });

  test('setup with daily log file generation', () => {
    // Mock the config to test other branch of if statement
    jest.mock('../config', () => ({
      logging: {
        level: 'debug',
        directory: 'logs'
      }
    }));
    const containerPromise = import('./winston');
    const configPromise = import('../config');
    containerPromise.then(container => {
      configPromise.then(config => {
        const logger = container.default.get('application');
        expect(logger).toBeDefined();
        expect(logger.transports).toHaveLength(2);
        expect(logger.transports[0].level).toBe(config.default.logging.level);
        expect(logger.transports[1].level).toBe(config.default.logging.level);
      });
    });
  });
});

export {};
