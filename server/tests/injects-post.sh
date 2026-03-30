#!/bin/env sh

curl -X POST http://localhost:8001/api/v1/injects/ \
  -H "Content-Type: application/json" \
  -d '{"id":"i-001","title":"Power Outage","description":"Primary datacenter loses power at 14:32"}'

curl -X POST http://localhost:8001/api/v1/injects/ \
  -H "Content-Type: application/json" \
  -d '{"id":"i-002","title":"Network Outage","description":"Secondary datacenter loses network connectivity at 15:45"}'

curl -X POST http://localhost:8001/api/v1/injects/ \
  -H "Content-Type: application/json" \
  -d '{"id":"i-003","title":"Malware Attack","description":"Primary datacenter experiences a malware attack at 16:00"}'
