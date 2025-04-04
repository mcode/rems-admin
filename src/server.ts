import cors, { CorsOptions } from 'cors';
import bodyParser from 'body-parser';
import container from './lib/winston';
import morgan from 'morgan';
import { CdsService } from './rems-cds-hooks/resources/CdsService';
import remsService from './hooks/rems.ordersign';
import orderSelectService from './hooks/rems.orderselect';
import patientViewService from './hooks/rems.patientview';
import encounterStartService from './hooks/rems.encounterstart';
import { Server } from '@projecttacoma/node-fhir-server-core';
import Etasu from './lib/etasu';
import Ncpdp from './ncpdp/script';
import Api from './lib/api_routes';
import env from 'env-var';
import https from 'https';
import fs from 'fs';
import bodyParserXml from 'body-parser-xml';

const logger = container.get('application');


const initialize = (config: any) => {
  //const logLevel = _.get(config, 'logging.level');
  return new REMSServer(config.fhirServerConfig)
    .configureMiddleware(config.fhirServerConfig.server.corsOptions)
    .configureSession()
    .configureHelmet()
    .configurePassport()
    .setPublicDirectory()
    .setProfileRoutes()
    .registerCdsHooks(config.server)
    .configureEtasuEndpoints()
    .configureNCPDPEndpoints()
    .configureUIEndpoints()
    .setErrorRoutes();
};

/**
 * @name exports
 * @static
 * @summary Main Server for the application
 * @class Server
 */
class REMSServer extends Server {
  services: CdsService[];
  /**
   * @method constructor
   * @description Setup defaults for the server instance
   */

  constructor(config: any) {
    super(config);
    this.services = [];
    return this;
  }

  _app() {
    return this.app;
  }
  /**
   * @method configureMiddleware
   * @description Enable all the standard middleware
   */
  configureMiddleware(corsOptions: CorsOptions) {
    super.configureMiddleware();
    this.app.set('showStackError', true);
    this.app.set('jsonp callback', true);
    this.app.use(bodyParser.urlencoded({ limit: '50mb', extended: true }));
    this.app.use(bodyParser.json({ limit: '50mb' }));

    this.app.use(cors(corsOptions));
    this.app.options('*', cors(corsOptions));

    return this;
  }

  /**
   * @method configureLogstream
   * @description Enable streaming logs via morgan
   */
  configureLogstream({ log, level = 'info' }: { log?: any; level?: string } = {}) {
    super.configureLogstream;
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
    this.app.post(`${this.cdsHooksEndpoint}/${definition.id}`, handler);

    //TODO: remove this after request generator is updated to a new order-sign prefetch
    // add a post endpoint to match the old CRD server
    this.app.post(`/r4${this.cdsHooksEndpoint}/${definition.hook}-crd`, handler);

    return this;
  }

  registerCdsHooks({ discoveryEndpoint = '/cds-services' }: any) {
    this.cdsHooksEndpoint = discoveryEndpoint;
    this.registerService(remsService);
    this.registerService(orderSelectService);
    this.registerService(patientViewService);
    this.registerService(encounterStartService);
    this.app.get(discoveryEndpoint, (req: any, res: { json: (arg0: { services: any }) => any }) =>
      res.json({ services: this.services })
    );
    this.app.get('/', (req: any, res: { send: (arg0: string) => any }) =>
      res.send('Welcome to the REMS Administrator')
    );
    return this;
  }

  configureEtasuEndpoints() {
    this.app.use('/etasu', Etasu);
    return this;
  }

  configureNCPDPEndpoints() {
    bodyParserXml(bodyParser);
    this.app.use(
      bodyParser.xml({
        limit: '1MB',
        xmlParseOptions: {
          normalize: true,
          normalizeTags: true,
          explicitArray: false
        }
      })
    );
    this.app.use('/', Ncpdp);
    return this;
  }

  configureUIEndpoints() {
    this.app.use('/api/', Api);
    return this;
  }

  /**
   * @method listen
   * @description Start listening on the configured port
   * @param {number} port - Default port to listen on
   * @param {function} [callback] - Optional callback for listen
   */
  listen({ port }: any, callback: any) {
    // If we want to use https, read in the cert files and start https server
    if (env.get('USE_HTTPS').required().asBool()) {
      const credentials = {
        key: fs.readFileSync(env.get('HTTPS_KEY_PATH').required().asUrlString()),
        cert: fs.readFileSync(env.get('HTTPS_CERT_PATH').required().asUrlString())
      };
      return https.createServer(credentials, this.app).listen(port, callback);
    }
    return this.app.listen(port, callback);
  }
}

// Start the application

export { REMSServer, initialize };
