#!/bin/sh

set -eu

export FRONTEND_PORT="${FRONTEND_PORT:-5173}"
export BACKEND_URL="${BACKEND_URL:-http://backend:8000}"
export DNS_RESOLVER="${DNS_RESOLVER:-$(awk '/^nameserver / { print $2; exit }' /etc/resolv.conf)}"

if [ -n "${AUTH_TOKEN:-}" ]; then
    export API_AUTHORIZATION="Bearer ${AUTH_TOKEN}"
else
    export API_AUTHORIZATION='$http_authorization'
fi

envsubst '${FRONTEND_PORT} ${BACKEND_URL} ${DNS_RESOLVER} ${API_AUTHORIZATION}' \
    < /etc/nginx/templates/default.conf.template \
    > /etc/nginx/conf.d/default.conf

exec "$@"
