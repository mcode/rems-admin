const container = require('../lib/winston.js');
const nodemon = require('nodemon');

let logger = container.get('application');

nodemon({
  script: 'src/scripts/develop.js',
  ext: 'js json',
  verbose: true,
  watch: ['src/**/*.json', 'src/**/*.js'],
  ignore: ['node_modules'],
});

nodemon
  .on('restart', files => logger.info(`Nodemon restarting because ${files.join(',')} changed.`))
  .on('crash', () => logger.info('Nodemon crashed. Waiting for changes to restart.'));

// Make sure the process actually dies when hitting ctrl + c
process.once('SIGINT', () => {
  nodemon.once('exit', () => {
    logger.info('Terminating Nodemon.');
    process.exit();
  });
});
