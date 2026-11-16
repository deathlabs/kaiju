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
frontend_pid=""

# Create the signed local token and its public key.
uv run --project "$BACKEND_BUILD_CONTEXT/$APP" \
	python scripts/auth.py \
		--issuer "$AUTH_ISSUER" \
		--audience "$AUTH_AUDIENCE"

# Stop the application processes.
cleanup() {
	trap - 0 INT TERM

	if [ -n "$backend_pid" ]; then
		kill "$backend_pid" 2>/dev/null || true
	fi

	if [ -n "$frontend_pid" ]; then
		kill "$frontend_pid" 2>/dev/null || true
	fi

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

# Start the frontend development server.
echo "[*] Starting $APP's frontend"
(
	. "${PWD}/.env"
	if [ "${DEV_AUTH_DISABLED:-0}" = "1" ]; then
		unset AUTH_TOKEN
	fi
	cd "$FRONTEND_BUILD_CONTEXT/$APP"
	exec npm run dev
) &
frontend_pid=$!

# Wait until a development process exits.
while kill -0 "$backend_pid" 2>/dev/null && kill -0 "$frontend_pid" 2>/dev/null; do
	sleep 0.1
done

# Preserve the status of the process that exited first.
if ! kill -0 "$backend_pid" 2>/dev/null; then
	wait "$backend_pid"
else
	wait "$frontend_pid"
fi
