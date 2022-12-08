import { initialize } from './server';
import container from './lib/winston';
import config from './config';
import remsService from './hooks/rems.hook';

/**
 * @name exports
 * @static
 * @summary Setup server and start the application
 * @function main
 */
export default async function main() {
  const logger = container.get('application');

  // Build our server
  logger.info('Initializing REMS Administrator');

  const app = initialize(config).registerService(remsService);

  const { server: serverConfig } = config;

  // Start the application
  app.listen(serverConfig, () => {
    logger.info('Application listening on port: ' + serverConfig.port);
  });
}
