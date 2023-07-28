# HTTPS / SSL Setup Guide
This document specifies how to launch each application in the prototype workflow with SSL enabled.

## Keycloak

### Generate Certs
#### Keycloak documentation
https://www.keycloak.org/server/enabletls

#### self-signed
`
keytool -genkeypair -alias localhost -keyalg RSA -keysize 2048 -validity 365 -keystore /tmp/certs/server.keystore -dname "cn=Server Administrator,o=Acme,c=GB" -keypass secret -storepass secret`

### Docker
`
docker run --volume=/tmp/certs:/certs -p 8543:8543 -e KEYCLOAK_ADMIN=admin -e KEYCLOAK_ADMIN_PASSWORD=admin codexrems/keycloak:REMSvCurrent start --import-realm --http-enabled=false --hostname=localhost --https-key-store-file=/certs/server.keystore --https-key-store-password=secret --https-port=8543`

### Docker-compose
```
keycloak:
    container_name: rems_dev_keycloak
    command: 'start --import-realm --http-enabled=false --hostname=localhost --https-key-store-file=/certs/server.keystore --https-key-store-password=secret --https-port=8543'
    ports:
      - '8543:8543'
    environment:
      - KEYCLOAK_USER=admin
      - KEYCLOAK_PASSWORD=admin
      - DB_VENDOR=h2
    volumes:
      - rems_dev_keycloak-data:/opt/keycloak/data/
      - /tmp/certs:/certs
    image: codexrems/keycloak:REMSvCurrent
```

### Standalone
`
KEYCLOAK_ADMIN=admin -e KEYCLOAK_ADMIN_PASSWORD=admin ./bin/kc.sh start --import-realm --http-enabled=false --hostname=localhost --https-key-store-file=/tmp/certs/server.keystore --https-key-store-password=secret --https-port=8543`

## mongodb
TBD

## test-ehr
To launch the test EHR with ssl enabled, set the following environment variables:

`EHR_SSL_ENABLED` defaults to false, needs to be true to use https.
`EHR_KEY_STORE_TYPE` defaults to `jks` but can also be `pkcs12` if using a PKCS12 keystore
`EHR_KEY_STORE_PATH` the path to the keystore file
`EHR_KEY_STORE_PASSWORD` the password for the keystore
`EHR_KEY_PASSWORD` the password for the key
`EHR_KEY_ALIAS` the alias of the key

## crd-request-generator
TBD

## REMS
TBD

## pims
TBD

## rems-smart-on-fhir
TBD