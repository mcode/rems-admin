# End to End Setup Guide - No Docker
Follow this guide if you would like to start each application without using Docker. Each must be launched separately (in a separate terminal window).

### Other Guides:

[Simple Set Up](SimpleSetupGuide.md) - This guide will get you up and running quickly with a demo environment for using the prototype locally. If you want to make changes or contribute to the codebase, see the detailed developer guide below.

[Developer Environment Set Up](DeveloperSetupGuide.md) - Follow this guide if you are a developer and intend on making code changes to the DRLS REMS project. This guide follows a much more technical set up process and is fully featured.


## Prerequisites
- Java, gradle
	- test-ehr
- node
	- REMS, pims, dtr, rems-smart-on-fhir, crd-request-generator

## Installation Order
1. Clone each Repo
2. Start Utility Applications
3. Start Test and Core Applications

## Clone Repos
```
git clone git@github.com:mcode/test-ehr.git
git clone git@github.com:mcode/crd-request-generator.git
git clone git@github.com:mcode/REMS.git
git clone git@github.com:mcode/pims.git
git clone git@github.com:mcode/dtr.git
git clone git@github.com:mcode/rems-smart-on-fhir.git
```

## Utilities

### keycloak
- Setup and run KeyCloak
	- Download KeyCloak 16.1.1 from [www.github.com/keycloak/keycloak/releases/tag/16.1.1](https://github.com/keycloak/keycloak/releases/tag/16.1.1)
	- Extract the downloaded file
		
		`tar -xvf keycloak-16.1.1.tar.gz`
	- Navigate into directory

		`cd keycloak-16.1.1/bin`
	- Start Keycloak

		`./standalone.sh -Djboss.socket.binding.port-offset=100`
	- Create admin user and log in
		- Launch the admin page in a web browser [localhost:8180/auth/](http://localhost:8180/auth/)
		- Create a username and password for the admin user
		- Select link for [Administration Console](http://localhost:8180/auth/admin/)
		- Log in as user that was just created
	- Import realm
		- Select `Master` on top left and choose `Add realm`
		- Select `Select file` in the middle
			- In the file selection box choose `<test-ehr_location>/src/main/resources/ClientFhirServerRealm.json`
		- Select `Create`
	- Note: newer versions of Keycloak work as well. 
		- Running 17, 18 or 19 with the legacy package (WildFly server) is setup the same as above. 
		- Running a different version with the newer Quarkus server
			- Update test-ehr and crd-request-generator configuration to point to the correct auth end points
				- Remove `/auth` from the URLs
			- Launch Keycloak

				`KEYCLOAK_ADMIN=admin KEYCLOAK_ADMIN_PASSWORD=admin ./bin/kc.sh start-dev --http-port=8180`
			- Configuration address for importing realm: [localhost:8180/admin/](http://localhost:8180/admin/)

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

- Setup

	`npm install`

- Run

	`npm start`

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

	`npm start`
	
	
