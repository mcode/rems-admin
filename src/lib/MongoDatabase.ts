import { Database } from './Database';
import * as mongoDB from 'mongodb';

export class MongoDatabase extends Database {
  options: any;
  db_name: string;

  constructor(config: any) {
    super(config);
    this.options = config.options;
    this.db_name = config.db_name;
    return this;
  }

  connect = () =>
    new Promise(resolve => {
      // Connect to mongo
      console.log('MongoDatabase connect: ' + this.location);
      this.client = new mongoDB.MongoClient(this.location);
      this.database = this.client.db(this.db_name);
      return resolve(this.client.connect());
    });
}
