FROM node:18-alpine 
WORKDIR /REMS
COPY . .
CMD npm run start