# DRLS REMS Local Demo Setup Guide

## Guide Contents
- [Purpose](#purpose-of-this-guide)
- [Components](#components)
- [Quick Setup](#quick-setup)
- [Cleanup and Useful Options](#cleanup-and-useful-options)
  * [Setting Environment Variables](#setting-environment-variables)
  * [Configurable install](#docker-compose-without-porter)

## Purpose of this guide

This document details instructions on how to quickly get up and running with a local demo deployment of the full-stack Documentation Requirements Lookup Service (DRLS) REMS prototype environment. This is primarily meant for non-technical users interested in exploring the prototype on their own machine.

*Note:* If you are looking to contribute or make code changes, please see the full [Developer Environment Setup](DeveloperSetupGuide.md).

*Note:* If you are looking to just have more control or configuration options with Docker in your local environment, see [the configurable install](#docker-compose-without-porter).

## Components

The following DRLS components will be deployed in Docker locally:

1. [Coverage Requirements Discovery (CRD)](https://github.com/mcode/CRD)
2. [(Test) EHR FHIR Service](https://github.com/HL7-DaVinci/test-ehr)
3. [Documents, Templates, and Rules (DTR) SMART on FHIR app](https://github.com/mcode/dtr)
4. [Clinical Decision Support (CDS) Library](https://github.com/mcode/CDS-Library)
5. [CRD Request Generator](https://github.com/mcode/crd-request-generator)
6. [REMS](https://github.com/mcode/REMS)
7. [Pharmacy Information System](https://github.com/mcode/pharmacy-information-system)
8. [Keycloak](https://www.keycloak.org/)

## Quick Setup

### 1. Verify or Install Prerequisites

#### System Requirements
Your computer must have these minimum requirements:
- x86_64 (64-bit) or equivalent processor
- At least 12 GB of RAM
- At least 256 GB of storage
- Internet access
- [Chrome browser](https://www.google.com/chrome/) installed
- **[Docker Desktop](https://www.docker.com/products/docker-desktop)** installed - after installing ensure it is running using their setup guide. For resources, the system requires more than the default. Click the settings cog and go to resources. Allocate 8GB+ of RAM (16GB is ideal), and 4+ CPUs. Make sure you install Docker Desktop version 18.03 or later.

### 2. Obtain [Value Set Authority Center (VSAC)](https://vsac.nlm.nih.gov/) API key
  1. [Click here](https://www.nlm.nih.gov/research/umls/index.html) to read about UMLS
  2. Click 'request a license' under 'Get Started'
  3. If you already have a key you can click 'Visit Your Profile' in the right hand side-bar. The API key will be listed under your username.
  4. If you do not have a key, click 'Generate an API Key'
  5. Sign in using one of the providers (Login.gov recommended)
  6. Generating the key is an automated process, you should be approved via e-mail fairly quickly. If not, use the contact information in the first link to reach out to the office (this is not managed by our team / system).
  7. Once approved, loop back to step 2

### 3. Run

- [Git installed](https://www.atlassian.com/git/tutorials/install-git)
- Use git to clone or download and extract the zip of the [REMS repository](https://github.com/mcode/REMS.git) - in your terminal navigate to the REMS repo folder.
- Before running, setup environment with VSAC credentials (see [setting environment variables section](#setting-environment-variables) for help)

    > At this point, you should have credentials to access VSAC. If not, please refer to [Prerequisites](#prerequisites) for how to create these credentials and return here after you have confirmed you can access VSAC.
    > To download the full ValueSets, your VSAC account will need to be added to the CMS-DRLS author group on https://vsac.nlm.nih.gov/. You will need to request membership access from an admin. Please reach out to Sahil Malhotra at smalhotra@mitre.org in order to request access to the CMS-DRLS author group. If this is not configured, you will get `org.hl7.davinci.endpoint.vsac.errors.VSACValueSetNotFoundException: ValueSet 2.16.840.1.113762.1.4.1219.62 Not Found` errors.

    > While this step is optional, we **highly recommend** that you do it so that DRLS will have the ability to dynamically load value sets from VSAC.

    You can see a list of your pre-existing environment variables on your machine by running `env` in your Terminal. To add to `env`:
    1. Set "VSAC_API_KEY" in the .env file in the REMS Repository

        or

    1. `cd ~/`
    2. Open `.bash_profile` and add the following lines at the very bottom:
        ```bash
        export VSAC_API_KEY=vsac_api_key
        ```
    3. Save `.bash_profile` and complete the update to `env`:
        ```bash
        source .bash_profile
        ```

    > Be aware that if you have chosen to skip this step, you will be required to manually provide your VSAC credentials at http://localhost:8090/data and hit **Reload Data** every time you want DRLS to use new or updated value sets.

    Note: How you set environment and path variables may vary depending on your operating system and terminal used. See [setting environment variables section](#setting-environment-variables) for more information.

- Add Compose Project Name to environment

    You can see a list of your pre-existing environment variables on your machine by running `env` in your Terminal. To add to `env`:
    1. Set "COMPOSE_PROJECT_NAME" as "rems_prod" in the .env file in the REMS Repository

        or

    1. `cd ~/`
    2. Open `.bash_profile` and add the following lines at the very bottom:
        ```bash
        export COMPOSE_PROJECT_NAME=rems_prod
        ```
    3. Save `.bash_profile` and complete the update to `env`:
        ```bash
        source .bash_profile
        ```

    Note: How you set environment and path variables may vary depending on your operating system and terminal used. See [setting environment variables section](#setting-environment-variables) for more information.

    Note: The compose project name is to disambiguate between different set ups on the same machine and can be set to any identifier. If you are following both options mentioned in this guide, it is recommended to change the compose project name for each so that they differ.


- Start docker compose application

    ```bash
        cd REMS # Need to execute commands in directory with corresponding docker-compose.yml file located in the REMS repository
        docker-compose up
    ```

    Note, if you are using an M1/M2 mac, you'll need to prepend `docker-compose` commands with `COMPOSE_DOCKER_CLI_BUILD=1 DOCKER_BUILDKIT=1 DOCKER_DEFAULT_PLATFORM=linux/arm64`.
    ```bash
        cd REMS # Need to execute commands in directory with corresponding docker-compose.yml file located in the REMS repository
        COMPOSE_DOCKER_CLI_BUILD=1 DOCKER_BUILDKIT=1 DOCKER_DEFAULT_PLATFORM=linux/arm64 docker-compose up
    ```

### 4. Verify everything is working

#### The fun part: Generate a test request

1. Go to http://localhost:3000 and play the role of a prescriber.
2. Click **Patient Select** button in upper left.
3. Find **Jon Snow** in the list of patients and click the dropdown menu next to his name.
4. Select **2183126 - Turalio 200 MG Oral Capsule** in the dropdown menu.
5. Click anywhere in the row to select Jon Snow.
6. Click **Send Rx to PIMS** at the bottom of the page to send a prescription to the Pharmacist.
7. Click **Submit to REMS-Admin** at the bottom of the page.
8. After several seconds you should receive a response in the form of two **CDS cards**:
    - **Drug Has REMS: Documentation Required.**
9. Select **Patient Enrollment Form** on the returned CDS card with summary **Drug Has REMS: Documentation Required**.
10. If you are asked for login credentials, use **alice** for username and **alice** for password.
11. A webpage should open in a new tab, and after a few seconds, a questionnaire should appear.
12. Fill out questionnaire and hit **Submit REMS Bundle**.
13. A new UI will appear with REMS Admin Status and Pharmacy Status.
14. Go to http://localhost:5050 and play the role of a pharmacist.
<!-- 15. Click on **Log in as Admin** in the top right of the page -->
<!-- 16. Sign in with the pre-configured user Suzy:
	* Email: spharmichael@example.com
	* Password: suzy -->
15. Click **Doctor Orders** in the top hand navigation menu on the screen
16. See the Doctor Order that was sent to the pharmacist from the prescriber.
17. Repeat steps 9-12 for submitting the Prescriber Enrollment and Prescriber Knowledge Assessment Forms and check how ETASU statuses change in both the PIMS prescription UI and the Prescriber status page. 

Congratulations! DRLS is fully installed and ready for you to use!


## Cleanup and Useful Options

### Uninstall the docker-compose application 
```bash
    docker-compose down # Removes application servers
```
or if on M1/M2 mac use 

```bash
    docker-compose -f docker-compose-m1.yml down # Removes application servers
```

### Cleanup docker resources

To remove all images, volumes, and artifacts set up during the install, run the following commands

```bash
    docker image prune -a
    docker volume prune
    docker network prune
```

### Updating docker-compose application images

```bash
    docker-compose build --no-cache --pull [<service_name1> <service_name2> ...]
    docker-compose --force-recreate  [<service_name1> <service_name2> ...]
```

```bash

    # Options:
    #   --force-recreate                        Recreate containers even if their configuration and image haven't changed.
    #   --build                                 Build images before starting containers.
    #   --pull                                  Pull published images before building images.
    #   --no-cache                              Do not use cache when building the image.
    #   [<service_name1> <service_name2> ...]   Services to recreate, not specifying any service will rebuild and recreate all services
```


### Setting Environment Variables

How you set environment and path variables may vary depending on your operating system and terminal used. For instance, for zsh on MacOS you typically need to modify .zshrc instead of .bash_profile. To figure out how to set environment variables for your system, consult the guides below or google `how to permanently set environment/path variables on [insert operating system] [insert terminal type]`.

    For more information on how to set environment variables consult these following guides:

    - https://chlee.co/how-to-setup-environment-variables-for-windows-mac-and-linux/
    - https://www3.ntu.edu.sg/home/ehchua/programming/howto/Environment_Variables.html
    - https://unix.stackexchange.com/questions/117467/how-to-permanently-set-environmental-variables

    > At this point, you should have credentials to access VSAC. If not, please refer to step 2 of [quick setup](#quick-setup) for how to create these credentials and return here after you have confirmed you can access VSAC. If this is not configured, you will get `org.hl7.davinci.endpoint.vsac.errors.VSACValueSetNotFoundException: ValueSet 2.16.840.1.113762.1.4.1219.62 Not Found` errors.

    > While this step is optional, we **highly recommend** that you do it so that DRLS will have the ability to dynamically load value sets from VSAC.

Set `VSAC_API_KEY` in your terminal environment to the API key obtained from your [UMLS profile page](https://uts.nlm.nih.gov/uts/edit-profile) - for more info on getting your VSAC key see [step 2 of quick setup section](#quick-setup). For setting up your environment, see the [Setting Environment Variables](#setting-environment-variables) section.

Bash example:
    ```bash
    export VSAC_API_KEY=vsac_api_key
    ````

