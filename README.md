# rems-admin

## Running only the REMS server project locally
1.  Clone the REMS repositories from Github:
    ```bash
    git clone https://github.com/mcode/rems-admin.git rems-admin 
    ```
2. Run dockerRunner.sh script
    ```bash
    npm run start
    ```

### How To Override Defaults
The .env file contains the default URI paths, these can be overwritten from the start command as follows:
 `MONGO_URL=http://example.com SERVER_PORT=6000 npm start`
 
Following are a list of modifiable paths: 

| URI Name      | Default |
| ----------- | ----------- |
| MONGO_URL | `mongodb://rems-user:pass@127.0.0.1:27017` |
| MONGO_DB_NAME | `remsadmin` |
| WHITELIST | `http://localhost, http://localhost:3005` |
| LOGGING_LEVEL | `debug` |
| PORT | `8090` |
| RESOURCE_SERVER | `http://localhost:8090` |
| AUTH_SERVER_URI | `http://localhost:8090` |
| VSAC_API_KEY | `changeMe` |
| SMART_ENDPOINT | `http://localhost:3005/launch` |
| HTTPS_KEY_PATH | `server.key` |
| HTTPS_CERT_PATH | `server.cert` |
| USE_HTTPS | `false`|

## Running the Mongo DB instance 
1. On the first run use the following command to create a docker mongo instance:
    ```bash
        docker run --name rems_local_pims_remsadmin_mongo --expose 27017 -p 27017:27017 -e MONGO_INITDB_ROOT_USERNAME='rems-admin-pims-root' -e MONGO_INITDB_ROOT_PASSWORD='rems-admin-pims-password' -v rems_local_pims_remsadmin_mongo:/data/db -v "$(pwd)"/mongo-init.js:/docker-entrypoint-initdb.d/mongo-init.js mongo
    ```
    To stop the running container, simply use ctrl + c


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

## Running the REMS Adminstrator

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
