FROM node:18-alpine 
WORKDIR /rems-admin

ARG PORT
ENV PORT=${PORT}

COPY --chown=node:node . .
RUN npm install
EXPOSE 8090
RUN apk update 
RUN apk upgrade
RUN apk search curl 
RUN apk add curl
HEALTHCHECK --interval=60s --timeout=10m --retries=10 CMD curl --fail http://localhost:${PORT} || exit 1
EXPOSE 8095
CMD npm run start