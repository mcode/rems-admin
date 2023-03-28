// Create Databases
const dbPims = db.getSiblingDB('pims');
const dbRemsAdmin = db.getSiblingDB('remsadmin');
dbRemsAdmin.createUser({ user: "rems-user",
  pwd: "pass",
  roles: [
    { role: "readWrite", db: "remsadmin" } 
  ]
})
// Create Collections
dbPims.createCollection('pims-tmp');
dbRemsAdmin.createCollection('remsadmin-tmp');

// // Insert document to ensure db/collection is created
// dbPims.pimscollection.insertOne({name: 'Hello World!'})
// dbRemsAdmin.remsadmincollection.insertOne({name: 'Hello World Again!'})