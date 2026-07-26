#!/usr/bin/env sh

set -e

python manage.py migrate

uvicorn kaiju.asgi:application --host 0.0.0.0 --port 8000
