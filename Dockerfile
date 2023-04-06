FROM node:18-alpine 
WORKDIR /REMS
COPY --chown=node:node . .
RUN npm install
EXPOSE 8090
CMD npm run start