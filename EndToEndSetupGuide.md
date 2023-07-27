# End to End Setup Guide - No Docker
Follow this guide if you would like to start each application without using Docker. Each must be launched separately (in a separate terminal window).

### Other Guides:

[Simple Set Up](SimpleSetupGuide.md) - This guide will get you up and running quickly with a demo environment for using the prototype locally. If you want to make changes or contribute to the codebase, see the detailed developer guide below.

[Developer Environment Set Up](DeveloperSetupGuide.md) - Follow this guide if you are a developer and intend on making code changes to the DRLS REMS project. This guide follows a much more technical set up process and is fully featured.

[SSL Setup](SSLSetupGuide.md) - Follow this guide to enable SSL on the various REMS applications.


## Prerequisites
- Java, gradle
	- test-ehr
- node
	- REMS, pims, dtr, rems-smart-on-fhir, crd-request-generator
- git
	- On Windows 'Git Bash' was used for the command line interface

## Installation Order
1. Clone each Repo
2. Start Utility Applications
3. Start Test and Core Applications

## Clone Repos
```
git clone https://github.com/mcode/test-ehr.git
git clone https://github.com/mcode/crd-request-generator.git
git clone https://github.com/mcode/REMS.git
git clone https://github.com/mcode/pims.git
git clone https://github.com/mcode/dtr.git
git clone https://github.com/mcode/rems-smart-on-fhir.git
git clone https://github.com/mcode/rems-smart-on-fhir.git
```

## Utilities

### keycloak
- Setup and run KeyCloak
	- Download KeyCloak 22.0.1 from [www.github.com/keycloak/keycloak/releases/tag/22.0.1](https://github.com/keycloak/keycloak/releases/tag/22.0.1)
	- Extract the downloaded file
		
		`tar -xvf keycloak-22.0.1.tar.gz`
	- Navigate into directory

		`cd keycloak-22.0.1`
	- Start Keycloak

		`KEYCLOAK_ADMIN=admin KEYCLOAK_ADMIN_PASSWORD=admin ./bin/kc.sh start-dev --http-port=8180 --import-realm --hostname=localhost`
	- Place realm file in proper folder

		`mkdir data/import`

		`cp <test-ehr_location>/src/main/resources/ClientFhirServerRealm.json data/import/`
	- Log in as admin user (optional)
		- Launch the admin page in a web browser [localhost:8180/admin/](http://localhost:8180/admin/)
		- Select link for [Administration Console](http://localhost:8180/auth/admin/)
		- Log in as admin/admin

### mongodb
- Setup and Run MongoDB
	- Download the latest version for your OS from [www.mongodb.com/try/download/community](https://www.mongodb.com/try/download/community)
	- Extract the downloaded package
		- Linux and Mac
	
			`tar -xvf <package.tgz>`
		- Windows

			`unzip <package.zip`
	- Navigate into directory

		`cd <package>`
	- Create folder for database

		`mkdir db`
	- Run mongo

		`./bin/mongod --dbpath db`
- Setup Mongo Shell `mongosh` to initialize the database
	- Download latest version for your OS from [www.mongodb.com/try/download/shell](https://www.mongodb.com/try/download/shell)
	- Extract the package

		`unzip <package.zip>`
	- Navigate into directory

		`cd <package>`
	- Initialize the database
		- (Database must already be running)

		`./bin/mongosh mongodb://localhost:27017 <REMS_PATH>/mongo-init.js`
	- Alternate Install Instructions: [www.mongodb.com/docs/mongodb-shell/install/#std-label-mdb-shell-install](https://www.mongodb.com/docs/mongodb-shell/install/#std-label-mdb-shell-install)
	
- Restart mongo
	- Stop the application
	- Start as above
		`./bin/mongod --dbpath db`
	- Applications should now be able to connect

## Test Applications

### test-ehr

- Navigate into directory already cloned from GitHub [www.github.com/mcode/test-ehr](https://www.github.com/mcode/test-ehr)

	`cd test-ehr`

- Run

	`gradle bootRun`

- Load Data (in separate window, also in repo folder)

	`gradle loadData`

### crd-request-generator

- Navigate into directory already cloned from GitHub [www.github.com/mcode/crd-request-generator](https://www.github.com/mcode/crd-request-generator)

	`cd crd-request-generator`

- Setup

	`npm install`

- Run

	`npm start`

## Core Applications

### REMS
- Navigate into directory already cloned from GitHub [www.github.com/mcode/REMS](https://www.github.com/mcode/REMS)

	`cd REMS`

- Submodule Initialization

	`git submodule update --init`
	
- Update env.json
	- Add your VSAC key to env.json as the default value for `VSAC_API_KEY`

- Setup

	`npm install`

- Run

	`npm start`

### pims
- Navigate into directory already cloned from GitHub [www.github.com/mcode/pims](https://www.github.com/mcode/pims)

	`cd pims`

- Backend
	- Navigate to the backend directory
		
		`cd backend`
	- Setup

		`npm install`
	- Run

		`npm start`
		
- Frontend
	- Navigate to the frontend directory

		`cd frontend`
	- Setup

		`npm install`
	- Run
		- Linux or Mac

			`npm start`
		- Windows

			`PORT=5050 npm start`
 
### dtr
- Navigate into directory already cloned from GitHub [www.github.com/mcode/dtr](https://www.github.com/mcode/dtr)

	`cd dtr`

- Setup

	`npm install`

- Run

	`npm start`

### rems-smart-on-fhir
- Navigate into directory already cloned from GitHub [www.github.com/mcode/rems-smart-on-fhir](https://www.github.com/mcode/rems-smart-on-fhir)

	`cd rems-smart-on-fhir`

- Submodule Initialization

	`git submodule update --init`

- Setup

	`npm install`

- Run
	- Linux or Mac

		`npm start`
	- Windows

		`PORT=4040 npm run start`
	
	
