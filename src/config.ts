import { constants as fhirConstants } from '@projecttacoma/node-fhir-server-core';
import env from 'var';

// Set up whitelist
const whitelist_env =
  (env.WHITELIST && env.WHITELIST.split(',').map((host: string) => host.trim())) || false;

// If no whitelist is present, disable cors
// If it's length is 1, set it to a string, so * works
// If there are multiple, keep them as an array
const whitelist = whitelist_env && whitelist_env.length === 1 ? whitelist_env[0] : whitelist_env;

export default {
  server: {
    port: 8090,
    discoveryEndpoint: '/cds-services'
  },
  smart: {
    endpoint: 'http://localhost:3005/launch'
  },
  logging: {
    level: 'info'
  },
  general: {
    resourcePath: 'CDS-Library/CRD-DTR'
  },
  database: {
    selected: 'tingo',
    tingoConfig: {
      location: 'tingo_db',
      options: ''
    },
    mongoConfig: {
      location: `mongodb://${env.MONGO_HOSTNAME}`,
      db_name: env.MONGO_DB_NAME,
      options: {
        //auto_reconnect: true,
        useUnifiedTopology: true,
        useNewUrlParser: true
      }
    }
  },
  fhirServerConfig: {
    auth: {
      // This servers URI
      resourceServer: env.RESOURCE_SERVER
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
      port: env.PORT || env.SERVER_PORT,
      // allow Access-Control-Allow-Origin
      corsOptions: {
        maxAge: 86400,
        origin: whitelist
      }
    },
    logging: {
      level: env.LOGGING_LEVEL
    },
    //
    // If you want to set up conformance statement with security enabled
    // Uncomment the following block
    //
    security: [
      {
        url: 'authorize',
        valueUri: `${env.AUTH_SERVER_URI}/authorize`
      },
      {
        url: 'token',
        valueUri: `${env.AUTH_SERVER_URI}/token`
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
        versions: [fhirConstants.VERSIONS['4_0_0']]
      },
      questionnaireresponse: {
        service: './src/services/questionnaireresponse.service.ts',
        versions: [fhirConstants.VERSIONS['4_0_0']]
      },
      valueset: {
        service: './src/services/valueset.service.ts',
        versions: [fhirConstants.VERSIONS['4_0_0']]
      }
    }
  }
};
