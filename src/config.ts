import { constants as fhirConstants } from '@projecttacoma/node-fhir-server-core';
import 'dotenv/config';
import * as env from 'env-var';

// Set up whitelist
const whitelistEnv = env.get('WHITELIST').asArray() || false;

// If no whitelist is present, disable CORS
// If its length is 1, set it to a string, so * works
// If there are multiple, keep them as an array
const whitelist = whitelistEnv && whitelistEnv.length === 1 ? whitelistEnv[0] : whitelistEnv;
export default {
  server: {
    port: env.get('PORT').asInt(),
    discoveryEndpoint: '/cds-services',
    name: env.get('SERVER_NAME').required().asString()
  },
  smart: {
    endpoint: env.get('SMART_ENDPOINT').required().asUrlString()
  },
  logging: {
    level: 'info'
  },
  general: {
    resourcePath: 'src/cds-library/CRD-DTR',
    VsacApiKey: env.get('VSAC_API_KEY').required().asString(),
    fullResourceInAppContext: env.get('FULL_RESOURCE_IN_APP_CONTEXT').required().asBool()
  },
  database: {
    selected: 'mongo',
    mongoConfig: {
      location: env.get('MONGO_URL').asString(),
      db_name: env.get('MONGO_DB_NAME').asString(),
      options: {
        //auto_reconnect: true,
        useUnifiedTopology: true,
        useNewUrlParser: true
      }
    }
  },
  fhirServerConfig: {
    auth: {
      // This server's URI
      resourceServer: env.get('RESOURCE_SERVER').required().asUrlString()
      //
      // if you use this strategy, you need to add the corresponding env vars to docker-compose
      //
      // strategy: {
      // 	name: 'bearer',
      // 	useSession: false,
      // 	service: './src/strategies/bearer.strategy.js'
      // },
    },
    server: {
      // support various ENV that uses PORT vs SERVER_PORT
      port: env.get('PORT').asInt(),
      // allow Access-Control-Allow-Origin
      corsOptions: {
        maxAge: 86400,
        origin: whitelist
      }
    },
    logging: {
      level: env.get('LOGGING_LEVEL').required().asString()
    },
    //
    // If you want to set up conformance statement with security enabled
    // Uncomment the following block
    //
    security: [
      {
        url: 'authorize',
        valueUri: `${env.get('AUTH_SERVER_URI').required().asUrlString()}/authorize`
      },
      {
        url: 'token',
        valueUri: `${env.get('AUTH_SERVER_URI').required().asUrlString()}/token`
      }
      // optional - registration
    ],
    //
    // Add any profiles you want to support.  Each profile can support multiple versions
    // if supported by core.  To support multiple versions, just add the versions to the array.
    //
    // Example:
    // Account: {
    //		service: './src/services/account/account.service.js',
    //		versions: [ VERSIONS['4_0_0'], VERSIONS['3_0_1'], VERSIONS['1_0_2'] ]
    // },
    //
    profiles: {
      Patient: {
        service: './src/services/patient.service.ts',
        versions: [fhirConstants.VERSIONS['4_0_0']]
      },
      library: {
        service: './src/services/library.service.ts',
        versions: [fhirConstants.VERSIONS['4_0_0']]
      },
      questionnaire: {
        service: './src/services/questionnaire.service.ts',
        versions: [fhirConstants.VERSIONS['4_0_0']],
        operation: [
          {
            name: 'questionnaire-package',
            route: '/:id/$questionnaire-package',
            method: 'POST',
            reference:
              'https://build.fhir.org/ig/HL7/davinci-dtr/OperationDefinition-Questionnaire-for-Order.html'
          }
        ]
      },
      questionnaireresponse: {
        service: './src/services/questionnaireresponse.service.ts',
        versions: [fhirConstants.VERSIONS['4_0_0']],
        operation: [
          {
            name: 'submit',
            route: '/$submit',
            method: 'POST',
            reference: 'http://hl7.org/fhir/OperationDefinition/QuestionnaireResponse-submit'
          }
        ]
      },
      valueset: {
        service: './src/services/valueset.service.ts',
        versions: [fhirConstants.VERSIONS['4_0_0']]
      },
      guidanceresponse: {
        service: './src/services/guidanceresponse.service.ts',
        versions: [fhirConstants.VERSIONS['4_0_0']],
        operation: [
          {
            name: 'rems-etasu',
            route: '/$rems-etasu',
            method: 'POST',
            reference:
              'https://build.fhir.org/ig/HL7/fhir-medication-rems-ig/OperationDefinition-REMS-ETASU.html'
          }
        ]
      }
    }
  }
};
