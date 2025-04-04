FROM node:18-alpine 
WORKDIR /rems-admin

ARG PORT=8090
ENV PORT=${PORT}

ARG FRONTEND_PORT=9090
ENV FRONTEND_PORT=${FRONTEND_PORT}

COPY --chown=node:node . .
RUN npm install

WORKDIR /rems-admin/frontend
RUN npm install

WORKDIR /rems-admin

EXPOSE 8090
EXPOSE 8095
EXPOSE 9090
EXPOSE 9095

HEALTHCHECK --interval=45s --start-period=60s --timeout=10m --retries=10 CMD (wget --no-verbose --tries=1 --spider http://localhost:${PORT} && wget --no-verbose --tries=1 --spider http://localhost:${FRONTEND_PORT}) || exit 1
CMD ./dockerRunnerProd.sh