FROM node:lts-alpine3.24 AS stage_1
ARG LANGGRAPH_DEPLOYMENT_URL
ENV LANGGRAPH_DEPLOYMENT_URL=${LANGGRAPH_DEPLOYMENT_URL}
SHELL ["/bin/ash", "-eo", "pipefail", "-c"]
WORKDIR /home/frontend/
COPY kaiju/ .
RUN echo "[*] LANGGRAPH_DEPLOYMENT_URL has been set to '$LANGGRAPH_DEPLOYMENT_URL'" &&\
    npm install && npm run build

FROM node:lts-alpine3.24
LABEL image.authors="Victor Fernandez III, @cyberphor"
WORKDIR /home/frontend/
COPY --from=stage_1 /home/frontend/.next/standalone/ .
COPY --from=stage_1 /home/frontend/.next/static/ .next/static/
COPY --from=stage_1 /home/frontend/public/ public/
ENV PORT=3000
EXPOSE 3000
USER node
CMD ["node", "server.js"]
