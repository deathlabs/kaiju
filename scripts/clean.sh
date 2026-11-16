#!/bin/sh

# Stop the script when a command fails or a variable is unset.
set -o errexit
set -o nounset

# Stop and remove the database container.
docker compose --profile database rm --stop --force database

# Remove the database volume if it exists.
config="$(docker compose --profile database config --format json)"
volume="$(printf '%s\n' "$config" | jq -er '.volumes.kaiju_database.name')"
test -n "$volume"
volumes="$(docker volume ls --quiet)"
if printf '%s\n' "$volumes" | grep -Fxq "$volume"; then
	docker volume rm "$volume"
fi

# Remove generated files and directories.
rm -f backend/kaiju/database.sqlite3
rm -f public-key.pem
rm -f ./*sbom.json
find . -name .git -prune -o -type d -name __pycache__ -prune -exec rm -rf {} +
find . -name .git -prune -o -type d -name .ruff_cache -prune -exec rm -rf {} +
find . -name .git -prune -o -type d -name .venv -prune -exec rm -rf {} +
find . -name .git -prune -o -type d -name node_modules -prune -exec rm -rf {} +
