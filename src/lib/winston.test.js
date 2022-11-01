/**
 * @NOTE: Reset modules in between tests so we can test the application of an
 * environment based configuration that changes between runs. We need this
 * for full coverage
 */
describe('Logger Class', () => {
  beforeEach(() => {
    jest.resetModules();
  });

  test('setup without daily log file', () => {
    const config = require('../config');
    const container = require('./winston');
    let logger = container.get('application');

    expect(logger).toBeDefined();
    expect(logger.transports).toHaveLength(1);
    expect(logger.transports[0].name).toBe('console');
    expect(logger.transports[0].level).toBe(config.logging.level);
  });

  test('setup with daily log file generation', () => {
    // Mock the config to test other branch of if statement
    jest.mock('../config', () => ({
      logging: {
        level: 'debug',
        directory: 'logs',
      },
    }));

    const config = require('../config');
    const container = require('./winston');
    let logger = container.get('application');

    expect(logger).toBeDefined();
    expect(logger.transports).toHaveLength(2);
    expect(logger.transports[0].name).toBe('console');
    expect(logger.transports[0].level).toBe(config.logging.level);
    expect(logger.transports[1].name).toBe('dailyRotateFile');
    expect(logger.transports[1].level).toBe(config.logging.level);
    expect(logger.transports[1].dirname).toBe(config.logging.directory);
  });
});
