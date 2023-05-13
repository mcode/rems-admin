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

// add the administrator user
const dbAdmin = db.getSiblingDB('admin');
dbAdmin.createUser({ user: "rems-admin-pims-root",
    pwd: "rems-admin-pims-password",
    roles: [
        { role: "userAdminAnyDatabase", db: "admin" }
    ]
})

// // Insert document to ensure db/collection is created
// dbPims.pimscollection.insertOne({name: 'Hello World!'})
// dbRemsAdmin.remsadmincollection.insertOne({name: 'Hello World Again!'})
