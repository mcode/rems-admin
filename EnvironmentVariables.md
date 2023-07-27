# Repositories and environment variables
## Repositories that define environment variables with default values
- mcode/REMS
    * .env.example
        + `VSAC_API_KEY`: no default value
        + `COMPOSE_PROJECT_NAME`: `rems_dev`
        + `PORTER_ALLOW_DOCKER_HOST_ACCESS`: `true`
    * docker-compose.yml
        + keycloak
            - `KEYCLOAK_USER`: `admin`
            - `KEYCLOAK_PASSWORD`: `admin`
            - `DB_VENDOR`: `h2`
        + test-ehr
            - `oauth_token`: `http://host.docker.internal:8180/auth/realms/ClientFhirServer/protocol/openid-connect/token`
        + crd-request-generator
            - `REACT_APP_REMS_CONFIG`: `true`
        + rems-administrator
            - `VSAC_API_KEY`: taken from host machine's value
            - `MONGO_URL`: `mongodb://rems-user:pass@pims_remsadmin_mongo:27017`
        + pims_remsadmin_mongo
            - `MONGO_INITDB_ROOT_USERNAME`: `rems-admin-pims-root`
            - `MONGO_INITDB_ROOT_PASSWORD`: `rems-admin-pims-password`
        + pims
            - `REMS_ADMIN_BASE`: `http://rems-administrator:8090`
            - `MONGO_URL`: `mongodb://pims_remsadmin_mongo:27017/pims`
    * docker-compose-dev.yml
        + keycloak
            - `KEYCLOAK_USER`: `admin`
            - `KEYCLOAK_PASSWORD`: `admin`
            - `DB_VENDOR`: `h2`
        + test-ehr
            - `oauth_token`: `http://host.docker.internal:8180/auth/realms/ClientFhirServer/protocol/openid-connect/token`
        + crd-request-generator
            - `REACT_APP_REMS_CONFIG`: `true`
        + rems-administrator
            - `VSAC_API_KEY`: taken from host machine's value
            - `MONGO_URL`: `mongodb://rems-user:pass@pims_remsadmin_mongo:27017`
        + pims_remsadmin_mongo
            - `MONGO_INITDB_ROOT_USERNAME`: `rems-admin-pims-root`
            - `MONGO_INITDB_ROOT_PASSWORD`: `rems-admin-pims-password`
        + pims
            - `REMS_ADMIN_BASE`: `http://rems-administrator:8090`
            - `MONGO_URL`: `mongodb://pims_remsadmin_mongo:27017/pims`

- mcode/rems-smart-on-fhir
    * .env
        + `REACT_APP_REMS_ADMIN_SERVER_BASE`: `http://localhost:8090`
        + `REACT_APP_REMS_HOOKS_PATH`: `/cds-services/rems-order-sign`
        + `REACT_APP_PHARMACY_SERVER_BASE`: `http://localhost:5051`
        + `REACT_APP_ETASU_STATUS_ENABLED`: `true`
        + `REACT_APP_PHARMACY_STATUS_ENABLED`: `true`
        + `PORT`: `4040`

- mcode/test-ehr
    * src/main/resources/application.yml
        + `auth_base`: `http://localhost:8180/auth/realms/ClientFhirServer/protocol/openid-connect`
        + `ehr_base`: `http://localhost:8080/test-ehr`
        + `client_id`: `app-token`
        + `client_secret`: no default value
        + `realm`: `ClientFhirServer`
        + `use_oauth`: `false`
        + `oauth_token`: `${auth_base}/token`
        + `oauth_authorize`: `${auth_base}/auth`
        + `proxy_authorize`: `${ehr_base}/auth`
        + `proxy_token`: `${ehr_base}/token`
        + `redirect_post_launch`: `${ehr_base}/_services/smart/Launch`
        + `redirect_post_token`: `${ehr_base}/token`
        + `introspection_url`: `${auth_base}/token/introspect`
        + `redirect_base`: `${ehr_base}/_auth/`
    * Dockerfile.keycloak
        + `KEYCLOAK_IMPORT`: `/resources/ClientFhirServerRealm.json`

## Repositories that use environment variables
- mcode/REMS
    * src/.env
        + `MONGO_URL` : `mongodb://rems-user:pass@127.0.0.1:27017`
        + `MONGO_DB_NAME` : `remsadmin`
        + `WHITELIST` : `http://localhost, http://localhost:3005`
        + `LOGGING_LEVEL` : `debug`
        + `PORT` : `8090`
        + `RESOURCE_SERVER` : `http://localhost:8090`
        + `AUTH_SERVER_URI` : `http://localhost:8090`
        + `VSAC_API_KEY` : `changeMe`
        + `SMART_ENDPOINT` : `http://localhost:3005/launch`
        + `HTTPS_KEY_PATH` : `server.key`
        + `HTTPS_CERT_PATH` : `server.cert`
        + `USE_HTTPS` : `false`
    * src/config.ts
        + `WHITELIST`
        + `PORT`
        + `SERVER_PORT`
        + `SMART_ENDPOINT`
        + `VSAC_API_KEY`
        + `MONGO_URL`
        + `MONGO_DB_NAME`
        + `RESOURCE_SERVER`
        + `LOGGING_LEVEL`
        + `AUTH_SERVER_URI`

- mcode/test-ehr
    * src/main/java/ca/uhn/fhir/jpa/starter/EnvironmentHelper.java
        + `elasticsearch.required_index_status`
        + `elasticsearch.schema_management_strategy`
        + `elasticsearch.debug.refresh_after_write`
        + `elasticsearch.debug.pretty_print_json_log`
        + `elasticsearch.rest_url`
        + `elasticsearch.protocol`
        + `elasticsearch.username`
        + `elasticsearch.password`
        + `elasticsearch.enabled`
        + `elasticsearch.enabled`
    * src/main/java/org/hl7/davinci/ehrserver/ClientAuthorizationInterceptor.java
        + `use_oauth`
        + `client_secret`
        + `client_id`
        + `introspect_url`
    * src/main/java/org/hl7/davinci/ehrserver/authproxy/AuthProxy.java
        + `oauth_authorize`
        + `oauth_token`
        + `redirect_base`

- mcode/crd-request-generator
    * src/registerServiceWorker.js
        + `NODE_ENV`
        + `PUBLIC_URL`
    * src/containers/RequestBuilder.js
        + `REACT_APP_EHR_BASE`
        + `REACT_APP_EHR_SERVER`
    * src/util/auth.js
        + `REACT_APP_AUTH`
        + `REACT_APP_REALM`
        + `REACT_APP_USER`
        + `REACT_APP_PASSWORD`
        + `REACT_APP_CLIENT`
        + `REACT_APP_PUBLIC_KEYS`
    * src/util/data.js
        + `REACT_APP_EHR_SERVER`
        + `REACT_APP_CDS_SERVICE`
        + `REACT_APP_ORDER_SELECT`
        + `REACT_APP_ORDER_SIGN`
        + `REACT_APP_AUTH`
        + `REACT_APP_ALTERNATIVE_THERAPY`
        + `LAUNCH_URL`
        + `FORM_EXPIRATION_DAYS`
        + `PIMS_URL`
    * src/util/fhir.js
        + `REACT_APP_AUTH`
        + `REACT_APP_REALM`
        + `REACT_APP_CLIENT`
        
- mcode/dtr
    * bin/prod
        + `REACT_APP_SERVER_PORT`
        + `REACT_APP_INITIAL_CLIENT`
    * bin/template
        + `REACT_APP_SERVER_PORT`
        + `REACT_APP_INITIAL_CLIENT`
    * src/backend/routes/metadata.js
        + `FHIR_VERSION`
    * bin/www
        + `PORT`
    * src/elmExecutor/buildPopulatedResourceBundle.js
        + `REACT_APP_EPIC_SUPPORTED_QUERIES`

- mcode/pims
    * src/backend/server.js
        + `BACKEND_PORT`
        + `ALLOWED_ORIGIN`
        + `MONGO_HOSTNAME`
        + `AUTH_SOURCE`
        + `MONGO_USERNAME`
        + `MONGO_PASSWORD`
    * src/backend/server.ts
        + `PORT`
        + `ALLOWED_ORIGIN`
        + `MONGO_HOSTNAME`
        + `AUTH_SOURCE`
        + `MONGO_USERNAME`
        + `MONGO_PASSWORD`
    * src/backend/routes/doctorOrders.js
        + `REMS_ADMIN_BASE`
    * frontend/src/App.tsx
        + `REACT_APP_PIMS_BACKEND_URL`
        + `REACT_APP_PIMS_BACKEND_PORT`

- mcode/rems-smart-on-fhir
    * src/views/Patient/MedReqDropDown/MedReqDropDown.tsx
        + `REACT_APP_REMS_ADMIN_SERVER_BASE`
    * src/views/Patient/MedReqDropDown/etasuStatus/EtasuStatus.tsx
        + `REACT_APP_REMS_ADMIN_SERVER_BASE`
    * src/views/Patient/MedReqDropDown/pharmacyStatus/PharmacyStatus.tsx
        + `REACT_APP_REMS_ADMIN_SERVER_BASE`
