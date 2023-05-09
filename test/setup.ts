import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose, { ConnectOptions } from 'mongoose';

let mongo: any;
before(async () => {
  console.log('Setting up MONGO');
  mongo = await MongoMemoryServer.create();
  const uri = mongo.getUri();
  const options: ConnectOptions = {};
  await mongoose.connect(uri, options);
});
after(async () => {
  console.log('Tearing down Mongo');
  await mongoose.connection.dropDatabase();
  await mongoose.connection.close();
  await mongo.stop();
});
