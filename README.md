# REMS

## Running the full prototype environment

You can find complete end-to-end full-stack set up guides for DRLS REMS at the following links:

[Simple Set Up](SimpleSetupGuide.md) - This guide will get you up and running quickly with a demo environment for using the prototype locally. If you want to make changes or contribute to the codebase, see the detailed developer guide below.

[Developer Environment Set Up](DeveloperSetupGuide.md) - Follow this guide if you are a developer and intend on making code changes to the DRLS REMS project. This guide follows a much more technical set up process and is fully featured.

## Running only the REMS server project locally
1.  Clone the REMS repositories from Github:
    ```bash
    git clone https://github.com/mcode/REMS.git REMS  
    ```
2. Run dockerRunner.sh script
    ```bash
    ./dockerRunner.sh  
    ```

# REMS Administrator
NOTE: The REMS Administrator is a work in progress.

## Running the REMS Adminstrator

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