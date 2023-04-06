FROM ubuntu:latest
WORKDIR /REMS
COPY . .
CMD npm run start