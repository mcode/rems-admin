FROM node:18-alpine 
WORKDIR /rems-admin

# Install MITRE Certs
RUN curl -ksSL https://gitlab.mitre.org/mitre-scripts/mitre-pki/raw/master/os_scripts/install_certs.sh | sh

ARG PORT
ENV PORT=${PORT}

COPY --chown=node:node . .
RUN npm install
EXPOSE 8090
RUN apk update 
RUN apk upgrade
RUN apk search curl 
RUN apk add curl
HEALTHCHECK --interval=60s --timeout=10m --retries=10 CMD curl --fail http://localhost:8090 || exit 1
EXPOSE 8095
CMD npm run start