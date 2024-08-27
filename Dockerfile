FROM node:18-alpine 
WORKDIR /rems-admin

ARG PORT=8090
ENV PORT=${PORT}

COPY --chown=node:node . .
RUN npm install
EXPOSE 8090

HEALTHCHECK --interval=30s --start-period=15s --timeout=10m --retries=10 CMD wget --no-verbose --tries=1 --spider http://localhost:${PORT} || exit 1
EXPOSE 8095
CMD npm run start