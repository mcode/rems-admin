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
### Running with MongoD or MongoS
Consult Documentation: https://www.mongodb.com/docs/v2.4/tutorial/configure-ssl/

### Running in Docker
Consult Documentation: https://medium.com/@prabhashdilhanakmeemana/how-to-start-a-mongo-db-server-in-docker-with-tls-enabled-da2bdd99caaf

## test-ehr
TBD

## crd-request-generator

### Generate Certs
#### self-signed

`openssl req -nodes -new -x509 -keyout server.key -out server.cert`

### Update ENV variable in env.json file
`USE_HTTPS = true`
Ensure the key and cert path are accurate, if not update SSL_KEY_FILE and SSL_CRT_FILE to point to generated certs.

## REMS

### Generate Certs
#### self-signed

`openssl req -nodes -new -x509 -keyout server.key -out server.cert`

### Update ENV variable in .env file
`USE_HTTPS = true`
Ensure the key and cert path are accurate, if not update HTTPS_KEY_PATH and HTTPS_CERT_PATH to point to generated certs. 

## pims
### Backend
#### Generate Certs
##### self-signed

`openssl req -nodes -new -x509 -keyout server.key -out server.cert`

#### Update ENV variable in env.json file
`USE_HTTPS = true`
Ensure the key and cert path are accurate, if not update HTTPS_KEY_PATH and HTTPS_CERT_PATH to point to generated certs. 

### Frontend
#### Generate Certs
##### self-signed

`openssl req -nodes -new -x509 -keyout server.key -out server.cert`

#### Update ENV variable in env.json file
`USE_HTTPS = true`
Ensure the key and cert path are accurate, if not update SSL_KEY_FILE and SSL_CRT_FILE to point to generated certs. 

## rems-smart-on-fhir
### Generate Certs
#### self-signed

`openssl req -nodes -new -x509 -keyout server.key -out server.cert`

### Update ENV variable in env.json file
`USE_HTTPS = true`
Ensure the key and cert path are accurate, if not update SSL_KEY_FILE and SSL_CRT_FILE to point to generated certs.