#!/usr/bin/env bash

# Stop the script when a command, variable, or pipeline fails.
set -o errexit
set -o nounset
set -o pipefail

# Set the backend and frontend source directories.
readonly BACKEND_SOURCE_DIR="$1"
readonly FRONTEND_SOURCE_DIR="$2"

# Check if uv is installed.
if command -v uv >/dev/null; then
	echo "[+] uv is installed"
else
	echo "[x] uv is not installed" >&2
	exit 1
fi

# Check if npm is installed.
if command -v npm >/dev/null; then
	echo "[+] npm is installed"
else
	echo "[x] npm is not installed" >&2
	exit 1
fi

# Install Ruff.
if uv tool install --force ruff; then
	echo "[+] Ruff is installed"
else
	echo "[x] Ruff is not installed" >&2
	exit 1
fi

# Install the backend dependencies.
if (cd "${BACKEND_SOURCE_DIR}" && uv sync --locked); then
	echo "[+] Backend dependencies are installed"
else
	echo "[x] Backend dependencies are not installed" >&2
	exit 1
fi

# Install the frontend dependencies.
if (cd "${FRONTEND_SOURCE_DIR}" && npm ci); then
	echo "[+] Frontend dependencies are installed"
else
	echo "[x] Frontend dependencies are not installed" >&2
	exit 1
fi
