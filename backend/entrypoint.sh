#!/usr/bin/env sh

set -e

uv run manage.py migrate
export DJANGO_SETTINGS_MODULE=kaiju.settings
exec uv run opentelemetry-instrument \
    uvicorn kaiju.asgi:application --host 0.0.0.0 --port 8000
