ARG FRONTEND_BUILD_BASE_IMAGE=node:24-alpine
ARG FRONTEND_RUNTIME_BASE_IMAGE=alpine:3.24

FROM ${FRONTEND_BUILD_BASE_IMAGE} AS stage_1

SHELL ["/bin/ash", "-eo", "pipefail", "-c"]
WORKDIR /home/kaiju/
COPY kaiju/package.json kaiju/package-lock.json ./
RUN npm ci
COPY kaiju/ ./
RUN npm run build

FROM ${FRONTEND_RUNTIME_BASE_IMAGE}

LABEL image.authors="Victor Fernandez III, @cyberphor"
WORKDIR /var/lib/nginx/
RUN apk add --no-cache gettext nginx 'zlib>=1.4-r0' &&\
    mkdir -p conf.d &&\
    chown nginx:nginx conf.d &&\
    if apk info -e wget >/dev/null 2>&1; then apk del wget; fi
COPY nginx.conf /etc/nginx/nginx.conf
COPY default.conf /etc/nginx/templates/default.conf.template
COPY --chmod=755 docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh
COPY --from=stage_1 /home/kaiju/dist/ html/
EXPOSE 5173
USER nginx
ENTRYPOINT ["docker-entrypoint.sh"]
CMD ["nginx", "-g", "daemon off;"]

