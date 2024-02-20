# rems-admin

## Running only the REMS server project locally

1.  Clone the REMS repositories from GitHub:
    ```bash
    git clone https://github.com/mcode/rems-admin.git rems-admin
    ```
2.  Run dockerRunner.sh script
    ```bash
    npm run start
    ```

### How To Override Defaults

The .env file contains the default URI paths, which can be overwritten from the start command as follows:
a) `REACT_APP_LAUNCH_URL=http://example.com PORT=6000 npm start` or b) by specifying the environment variables and desired values in a `.env.local`.

> **Bug**: Do note that the `SMART_ENDPOINT` environment variable cannot be overwritten in a `.env.local`, it must be done in the `.env`.

Following are a list of modifiable paths:

| URI Name        | Default                                    | Description                                                                                           |
| --------------- | ------------------------------------------ | ------------------------------------------------------------------------------------------------------|
| AUTH_SERVER_URI | `http://localhost:8090`                    | The base url of the auth server, currently set to the base url of this app.                           |
| HTTPS_CERT_PATH | `server.cert`                              | Path to a certificate for encryption, allowing HTTPS. Unnecessary if using HTTP.                      |
| HTTPS_KEY_PATH  | `server.key`                               | Path to a key for encryption, allowing HTTPS. Unnecessary if using HTTP.                              |
| LOGGING_LEVEL   | `debug`                                    | Amount to output in the log, can be changed to verbose, info, warn, or error.                         |
| MONGO_DB_NAME   | `remsadmin`                                | Name of the database table being used. Should be changed if not using the Mongo instructions below.   |                 
| MONGO_URL       | `mongodb://rems-user:pass@127.0.0.1:27017` | URL for the connection to the database, should be changed if not using the Mongo instructions below.  |
| PORT            | `8090`                                     | Port that this server should run on, change if there are conflicts with port usage.                   |
| RESOURCE_SERVER | `http://localhost:8090`                    | Base URL of this server, should match with port.                                                      |
| SMART_ENDPOINT  | `http://localhost:4040/launch`             | Launch URL of associated SMART app, should be changed if not using the REMS Smart App.                |
| USE_HTTPS       | `false`                                    | Change to true to enable HTTPS. Ensure that HTTPS_CERT_PATH and HTTPS_KEY_PATH are valid.             |
| VSAC_API_KEY    | `changeMe`                                 | Replace with VSAC API key for pulling down ValueSets.  Request an API Key from the [VSAC website](https://vsac.nlm.nih.gov/)                                                 |
| WHITELIST       | `http://localhost, http://localhost:3005`  | List of valid URLs for CORS. Should include any URLs the server accesses for resources.               |

## Running the Mongo DB instance

1. On the first run use the following command to create a Docker MongoDB instance:

   ```bash
       docker run --name rems_local_pims_remsadmin_mongo --expose 27017 -p 27017:27017 -e MONGO_INITDB_ROOT_USERNAME='rems-admin-pims-root' -e MONGO_INITDB_ROOT_PASSWORD='rems-admin-pims-password' -v rems_local_pims_remsadmin_mongo:/data/db -v "$(pwd)"/mongo-init.js:/docker-entrypoint-initdb.d/mongo-init.js mongo
   ```

   To stop the running container, simply use Ctrl + C.

2. On subsequent runs use the following command to start the existing mongo container:
   ```bash
       docker start rems_local_pims_remsadmin_mongo
   ```
   To stop the running container, simply run the below command
   ```bash
       docker stop rems_local_pims_remsadmin_mongo
   ```

# REMS Administrator

NOTE: The REMS Administrator is a work in progress.

## Running the REMS Administrator

#### Initialization

After cloning the repository, the submodules must be initialized. To do this you can run:

```
git submodule update --init
```

#### Setup

```
npm install
```

#### Run Tests

```
npm test
```

#### Run Application

```
npm start
```

Application will be running on port 8090.

To reach the CDS Services discovery information:

```
http://localhost:8090/cds-services
```
