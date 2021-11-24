FROM ubuntu:latest
WORKDIR /REMS
COPY . .
CMD ./dockerRunner.sh