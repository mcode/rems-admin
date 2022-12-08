import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import container from './lib/winston';
import morgan from 'morgan';
import _ from 'lodash';
import Hook from './hooks/Hook';

const logger = container.get('application');

const initialize = (config: any) => {
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
  app: express.Application;
  services: Hook[];
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
    this.app.use(bodyParser.json({ limit: '50mb' }));

    this.app.use(cors());
    this.app.options('*', cors());

    return this;
  }

  /**
   * @method configureLogstream
   * @description Enable streaming logs via morgan
   */
  configureLogstream({ log, level = 'info' }: { log?: any; level?: string } = {}) {
    this.app.use(
      log
        ? log
        : morgan('combined', {
            stream: { write: message => logger.log(level, message) }
          })
    );

    return this;
  }

  registerService({ definition, handler }: { definition: any; handler: any }) {
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
  listen({ port, discoveryEndpoint = '/cds-services' }: any, callback: any) {
    this.app.get(discoveryEndpoint, (req: any, res: { json: (arg0: { services: any }) => any }) =>
      res.json({ services: this.services })
    );
    this.app.get('/', (req: any, res: { send: (arg0: string) => any }) =>
      res.send('Welcome to the REMS Administrator')
    );
    return this.app.listen(port, callback);
  }
}

// Start the application

export { REMSServer, initialize };
