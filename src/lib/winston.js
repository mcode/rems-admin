const { Container, transports, format } = require('winston');
const { logging } = require('../config.js');
const path = require('path');

// Load in the daily file transport
require('winston-daily-rotate-file');

// Create our default logging container
let container = new Container();
let applicationTransports = [];

// Create a console transport
let transportConsole = new transports.Console({
  level: logging.level,
  timestamp: true,
  colorize: true,
});

applicationTransports.push(transportConsole);

// Create a file transport if we have specified the directory
if (logging.directory) {
  let transportDailyFile = new transports.DailyRotateFile({
    filename: path.join(logging.directory, 'application-%DATE%.log'),
    datePattern: 'YYYY-MM-DD-HH',
    level: logging.level,
    zippedArchive: true,
    maxSize: '20m',
  });

  applicationTransports.push(transportDailyFile);
}

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
module.exports = container;
