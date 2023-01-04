import { Database } from './Database';
import * as fs from 'fs';
/* eslint-disable */
const tingoDb = require('tingodb')();
/* eslint-enable */

export class TingoDatabase extends Database {
  constructor(config: any) {
    super(config);
    // read anything else needed from the config here
    return this;
  }

  connect = () =>
    new Promise(resolve => {
      // create the database folder
      fs.mkdirSync(this.location, { recursive: true });

      // Connect to tingo
      console.log('TingoDatabase connect: ' + this.location);
      this.database = new tingoDb.Db(this.location, {});
      this.client = '';
      return resolve(this.database);
    });
}
