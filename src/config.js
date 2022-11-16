module.exports = {
  server: {
    port: 8090,
    discoveryEndpoint: '/cds-services'
  },
  smart: {
    endpoint: 'http://localhost:3005/launch'
  },
  logging: {
    level: 'info'
  }
};
