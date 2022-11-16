import { Container, transports, format } from 'winston';
import { logging } from '../config.js';

interface ConfigData{
  directory?: string
  level: string
}
const logConfig: ConfigData = logging
// Load in the daily file transport
require('winston-daily-rotate-file');

// Create our default logging container
let container = new Container();
let applicationTransports = [];

// Create a console transport
let transportConsole = new transports.Console({
  level: logConfig.level,
});

applicationTransports.push(transportConsole);

// Add a default application logger
container.add('application', {
  format: format.combine(format.timestamp(), format.logstash()),
  transports: applicationTransports,
});
/**
 * @name exports
 * @static
 * @summary Logging container for the application
 */
export default container
