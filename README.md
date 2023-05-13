# REMS

## Prototype Organization Overview
[Prototype Repositories and Capabilities](PrototypeRepositoriesAndCapabilities.md)

## Running the full prototype environment

You can find complete end-to-end full-stack set up guides for DRLS REMS at the following links:

[Simple Set Up](SimpleSetupGuide.md) - This guide will get you up and running quickly with a demo environment for using the prototype locally. If you want to make changes or contribute to the codebase, see the detailed developer guide below.

[Developer Environment Set Up](DeveloperSetupGuide.md) - Follow this guide if you are a developer and intend on making code changes to the DRLS REMS project. This guide follows a much more technical set up process and is fully featured.

[Developer Environment Set Up (No Docker)](EndToEndSetupGuide.md) - Follow this guide if you are intend on starting every application separately without using docker.

## Running only the REMS server project locally
1.  Clone the REMS repositories from Github:
    ```bash
    git clone https://github.com/mcode/REMS.git REMS  
    ```
2. Run dockerRunner.sh script
    ```bash
    npm run start
    ```

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
After cloning the repsistory, the submodules must be initialized. To do this you can run:

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
Application will be runnin on port 8090.

To reach the CDS Services discovery information:

```
http://localhost:8090/cds-services
```
