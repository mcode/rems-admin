import { initialize } from './server';
import container from './lib/winston'
import config from './config';

const remsService = require('./hooks/rems.hook');

/**
 * @name exports
 * @static
 * @summary Setup server and start the application
 * @function main
 */
export default async function main() {
  let logger = container.get('application');

  // Build our server
  logger.info('Initializing REMS Administrator');

  const app = initialize(config).registerService(remsService);

  const { server: serverConfig } = config;

  // Start the application
  app.listen(serverConfig, () => {
    logger.info('Application listening on port: ' + serverConfig.port);
  });
};
