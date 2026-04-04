#!/bin/env sh

curl -X POST http://localhost:8001/tabletop-exercises \
  -H "Content-Type: application/json" \
  -d @tabletop-exercise.json
