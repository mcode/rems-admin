const env = require('var');

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
        useNewUrlParser: true,
      },
    },
  }
};
