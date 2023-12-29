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

| URI Name        | Default                                    |
| --------------- | ------------------------------------------ |
| AUTH_SERVER_URI | `http://localhost:8090`                    |
| HTTPS_CERT_PATH | `server.cert`                              |
| HTTPS_KEY_PATH  | `server.key`                               |
| LOGGING_LEVEL   | `debug`                                    |
| MONGO_DB_NAME   | `remsadmin`                                |
| MONGO_URL       | `mongodb://rems-user:pass@127.0.0.1:27017` |
| PORT            | `8090`                                     |
| RESOURCE_SERVER | `http://localhost:8090`                    |
| SMART_ENDPOINT  | `http://localhost:4040/launch`             |
| USE_HTTPS       | `false`                                    |
| VSAC_API_KEY    | `changeMe`                                 |
| WHITELIST       | `http://localhost, http://localhost:3005`  |

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
