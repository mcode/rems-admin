// Create Databases
const dbPims = db.getSiblingDB('pims');
const dbRemsAdmin = db.getSiblingDB('remsadmin');

// Create Collections
dbPims.createCollection('pimscollection');
dbRemsAdmin.createCollection('remsadmincollection');

// Insert document to ensure db/collection is created
dbPims.pimscollection.insertOne({name: 'Hello World!'})
dbRemsAdmin.remsadmincollection.insertOne({name: 'Hello World Again!'})