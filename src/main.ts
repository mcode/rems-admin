import { initialize } from './server';
import container from './lib/winston';
import config from './config';
import remsService from './hooks/rems.hook';
import { Database } from './lib/Database';
import { TingoDatabase } from './lib/TingoDatabase';
import { MongoDatabase } from './lib/MongoDatabase';
import constants from './constants'
import { Globals } from './globals'
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

  const { server: serverConfig, database: databaseConfig } = config;

  // Setup the database
  var dbClient: Database;
  switch (databaseConfig.selected) {
    case constants.TINGO_DB:
      dbClient = new TingoDatabase(databaseConfig.tingoConfig);
      break;
    case constants.MONGO_DB:
    default:
      dbClient = new MongoDatabase(databaseConfig.mongoConfig);
  }
  try {
    await dbClient.connect();
  } catch (dbErr: any) {
    console.error(dbErr.message);
    console.error();
    process.exit(1);
  }
  Globals.databaseClient = dbClient.client;
  Globals.database = dbClient.database;

  const app = initialize(config).registerService(remsService);

  // Start the application
  app.listen(serverConfig, () => {
    logger.info('Application listening on port: ' + serverConfig.port);
  });
}
