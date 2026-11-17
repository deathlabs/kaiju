#!/bin/sh

# Stop the script when a command fails or a variable is unset.
set -o errexit
set -o nounset

# Check if the required environment variables are set.
if [ -z "${APP:-}" ]; then
	echo "APP is required." >&2
	exit 1
fi

if [ -z "${BACKEND_BUILD_CONTEXT:-}" ]; then
	echo "BACKEND_BUILD_CONTEXT is required." >&2
	exit 1
fi

if [ -z "${AUTH_AUDIENCE:-}" ]; then
	echo "AUTH_AUDIENCE is required." >&2
	exit 1
fi

if [ -z "${AUTH_ISSUER:-}" ]; then
	echo "AUTH_ISSUER is required." >&2
	exit 1
fi

if [ -z "${FRONTEND_BUILD_CONTEXT:-}" ]; then
	echo "FRONTEND_BUILD_CONTEXT is required." >&2
	exit 1
fi

# Start the database and prepare its data.
echo "[*] Starting $APP's database"
docker compose --profile database up -d --wait

(
	cd "$BACKEND_BUILD_CONTEXT"
	. ./.env.example
	export PGHOST=localhost
	unset VIRTUAL_ENV
	cd "$APP"
	echo "[*] Applying $APP's database migrations"
	uv run python manage.py migrate
	echo "[*] Seeding $APP's local development data"
	uv run python manage.py seed
)

# Set the backend and frontend process identifiers.
backend_pid=""
frontend_pids=""

# Create the signed local token and its public key.
uv run --project "$BACKEND_BUILD_CONTEXT/$APP" \
	python scripts/auth.py \
		--issuer "$AUTH_ISSUER" \
		--audience "$AUTH_AUDIENCE" \
		--multiple

# Stop the application processes.
cleanup() {
	trap - 0 INT TERM

	if [ -n "$backend_pid" ]; then
		kill "$backend_pid" 2>/dev/null || true
	fi

	for frontend_pid in $frontend_pids; do
		kill "$frontend_pid" 2>/dev/null || true
	done

	wait 2>/dev/null || true
}

# Stop both development processes when the script exits.
trap cleanup 0
trap 'exit 130' INT
trap 'exit 143' TERM

# Start the backend with the local database settings.
echo "[*] Starting $APP's backend"
(
	cd "$BACKEND_BUILD_CONTEXT"
	. ./.env.example
	. "${PWD}/../.env"
	export PGHOST=localhost
	unset VIRTUAL_ENV
	cd kaiju
	exec uv run python -m uvicorn "$APP.asgi:application" \
		--reload \
		--host 0.0.0.0 \
		--port 8000
) &
backend_pid=$!

# Wait for the backend health endpoint.
attempt=0
until curl --silent --fail --max-time 1 http://127.0.0.1:8000/api/v1/health/ > /dev/null; do
	if ! kill -0 "$backend_pid" 2>/dev/null; then
		echo "The backend stopped before it became healthy." >&2
		wait "$backend_pid" || exit $?
		exit 1
	fi

	attempt=$((attempt + 1))
	if [ "$attempt" -ge 30 ]; then
		echo "The backend did not become healthy within 30 attempts." >&2
		exit 1
	fi
	sleep 1
done

# Install the frontend dependencies when Vite is missing.
if [ ! -x "$FRONTEND_BUILD_CONTEXT/$APP/node_modules/.bin/vite" ]; then
	echo "[*] Installing $APP's frontend dependencies"
	(cd "$FRONTEND_BUILD_CONTEXT/$APP" && npm ci --include=dev)
fi

# Select distinct available ports for the frontend servers.
ports="$(uv run --project "$BACKEND_BUILD_CONTEXT/$APP" python -c '
import socket
from itertools import chain

sockets = []
ports = []
for port in chain([5173], range(6001, 65536)):
    server = socket.socket()
    try:
        server.bind(("127.0.0.1", port))
    except OSError:
        server.close()
        continue
    sockets.append(server)
    ports.append(port)
    if len(ports) == 8:
        break
if len(ports) != 8:
    raise SystemExit("Could not find eight available frontend ports.")
print(*ports)
')"
set -- $ports

# Start a frontend for each role with its own token.
. "${PWD}/.env"
start_frontend() {
	role="$1"
	port="$2"
	token="$3"
	(
		if [ "${DEV_AUTH_DISABLED:-0}" = "1" ]; then
			unset AUTH_TOKEN
		else
			AUTH_TOKEN="$token"
			export AUTH_TOKEN
		fi
		cd "$FRONTEND_BUILD_CONTEXT/$APP"
		exec ./node_modules/.bin/vite --host 127.0.0.1 --port "$port" --strictPort --clearScreen false --logLevel error
	) &
	frontend_pids="$frontend_pids $!"
	echo "[*] $role: http://localhost:$port"
}

start_frontend "Facilitator (Justin Hartung)" "$1" "$AUTH_TOKEN_FACILITATOR"
start_frontend "ISO (Daisuke Serizawa)" "$2" "$AUTH_TOKEN_ISO"
start_frontend "ISSM (Vic Fernandez III)" "$3" "$AUTH_TOKEN_ISSM"
start_frontend "ISSO (Shinichi Ozaki)" "$4" "$AUTH_TOKEN_ISSO"
start_frontend "System administrator (Kiriko Tsujimori)" "$5" "$AUTH_TOKEN_SYSTEM_ADMINISTRATOR"
start_frontend "User (Hiroshi Jinkawa)" "$6" "$AUTH_TOKEN_USER"
start_frontend "CSSP (Rando Yaguchi)" "$7" "$AUTH_TOKEN_CSSP"
start_frontend "OPFOR (Yoji Akitsu)" "$8" "$AUTH_TOKEN_OPFOR"

# Wait until a development process exits.
while kill -0 "$backend_pid" 2>/dev/null; do
	for frontend_pid in $frontend_pids; do
		if ! kill -0 "$frontend_pid" 2>/dev/null; then
			wait "$frontend_pid" || exit $?
			exit 1
		fi
	done
	sleep 0.1
done

# Preserve the status of the process that exited first.
wait "$backend_pid"
