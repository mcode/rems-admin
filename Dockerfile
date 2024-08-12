FROM node:18-alpine 
WORKDIR /rems-admin
COPY --chown=node:node . .
RUN npm install
EXPOSE 8090
EXPOSE 8095
CMD npm run start