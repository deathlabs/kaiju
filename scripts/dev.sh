#!/usr/bin/env bash

# Stop the script when a command, variable, or pipeline fails.
set -o errexit
set -o nounset
set -o pipefail

# Check if the required environment variables are set.
if [[ -z "${APP:-}" ]]; then
	echo "APP is required." >&2
	exit 1
fi

if [[ -z "${BACKEND_BUILD_CONTEXT:-}" ]]; then
	echo "BACKEND_BUILD_CONTEXT is required." >&2
	exit 1
fi

if [[ -z "${FRONTEND_BUILD_CONTEXT:-}" ]]; then
	echo "FRONTEND_BUILD_CONTEXT is required." >&2
	exit 1
fi

# Set the backend and frontend process identifiers.
backend_pid=""
frontend_pid=""

# Stop the application processes.
cleanup() {
	trap - EXIT INT TERM

	if [[ -n "$backend_pid" ]]; then
		kill "$backend_pid" 2>/dev/null || true
	fi

	if [[ -n "$frontend_pid" ]]; then
		kill "$frontend_pid" 2>/dev/null || true
	fi

	wait 2>/dev/null || true
}

# Stop both development processes when the script exits.
trap cleanup EXIT
trap 'exit 130' INT
trap 'exit 143' TERM

# Start the backend with the local database settings.
(
	cd "$BACKEND_BUILD_CONTEXT"
	source .env.example
	export PGHOST=localhost
	unset VIRTUAL_ENV
	cd kaiju
	exec uv run python -m uvicorn "$APP.asgi:application" \
		--reload \
		--host 0.0.0.0 \
		--port 8000
) &
backend_pid=$!

# Start the frontend development server.
(
	cd "$FRONTEND_BUILD_CONTEXT"
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
