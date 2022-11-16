const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const container = require('./lib/winston.js');
const morgan = require('morgan');
const _ = require('lodash');

let logger = container.get('application');

const initialize = config => {
  const logLevel = _.get(config, 'logging.level');
  return new REMSServer().configureLogstream(logLevel).configureMiddleware();
};

/**
 * @name exports
 * @static
 * @summary Main Server for the application
 * @class Server
 */
class REMSServer {
  /**
   * @method constructor
   * @description Setup defaults for the server instance
   */
  constructor() {
    this.app = express();
    this.services = [];
    return this;
  }

  /**
   * @method configureMiddleware
   * @description Enable all the standard middleware
   */
  configureMiddleware() {
    this.app.set('showStackError', true);
    this.app.set('jsonp callback', true);
    this.app.use(bodyParser.urlencoded({ limit: '50mb', extended: true }));
    this.app.use(bodyParser.json({ limit: '50mb', extended: true }));

    this.app.use(cors());
    this.app.options('*', cors());

    return this;
  }

  /**
   * @method configureLogstream
   * @description Enable streaming logs via morgan
   */
  configureLogstream({ log, level = 'info' } = {}) {
    this.app.use(
      log
        ? log
        : morgan('combined', {
            stream: { write: message => logger[level](message) }
          })
    );

    return this;
  }

  registerService({ definition, handler }) {
    this.services.push(definition);
    this.app.post(`/cds-services/${definition.id}`, handler);

    //TODO: remove this after request generator is updated to a new order-sign prefetch
    // add a post endpoint to match the old CRD server
    this.app.post(`/r4/cds-services/${definition.hook}-crd`, handler);

    return this;
  }

  /**
   * @method listen
   * @description Start listening on the configured port
   * @param {number} port - Defualt port to listen on
   * @param {function} [callback] - Optional callback for listen
   */
  listen({ port, discoveryEndpoint = '/cds-services' }, callback) {
    this.app.get(discoveryEndpoint, (req, res) => res.json({ services: this.services }));
    this.app.get('/', (req, res) => res.send('Welcome to the REMS Administrator'));
    this.app.listen(port, callback);

    return this;
  }
}

// Start the application

module.exports = { REMSServer, initialize };
