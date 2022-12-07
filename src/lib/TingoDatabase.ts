import { Database } from "./Database";
const tingoDb = require('tingodb')();

export class TingoDatabase extends Database {

  constructor(config: any) {
    super(config);
    // read anything else needed from the config here
    return this;
  }

  connect = () =>
    new Promise((resolve, reject) => {
      // Connect to tingo
      console.log("TingoDatabase connect: " + this.location);
      this.database = new tingoDb.Db(this.location, {})
      this.client = "";
      return resolve(this.database);
    });

}
