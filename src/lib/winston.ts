import winston, { Container, transports, format } from 'winston';
import config from '../config';
import 'winston-daily-rotate-file';
import path from 'path';
const logging = config.logging;
interface ConfigData {
  directory?: string;
  level: string;
}
const logConfig: ConfigData = logging;
// Create our default logging container
const container = new Container();
const applicationTransports = [];

// Create a console transport
const transportConsole = new transports.Console({
  level: logConfig.level,
  format: winston.format.combine(winston.format.colorize(), winston.format.json())
});

applicationTransports.push(transportConsole);
if (logConfig.directory) {
  const transportDailyFile = new transports.DailyRotateFile({
    filename: path.join(logConfig.directory, 'application-%DATE%.log'),
    datePattern: 'YYYY-MM-DD-HH',
    level: logging.level,
    zippedArchive: true,
    maxSize: '20m'
  });
  applicationTransports.push(transportDailyFile);
}
// Add a default application logger
container.add('application', {
  format: format.combine(format.timestamp(), format.logstash()),
  transports: applicationTransports
});

/**
 * @name exports
 * @static
 * @summary Logging container for the application
 */
export default container;
