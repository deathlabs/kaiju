
curl -X POST http://localhost:8000/api/v1/exercises/ \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Incident Response TTX",
    "scenario": "Unknown anomalous outbound network activity was observed originating from the Production environment.",
    "type": "discussion_and_hands_on",
    "start_date_time": "2026-09-04T13:00:00-04:00",
    "end_date_time": "2026-09-04T15:00:00-04:00"
  }'

export EXERCISE=$(curl -s http://localhost:8000/api/v1/exercises/ | jq -r .[0].id)

curl -X PATCH http://localhost:8000/api/v1/exercises/$EXERCISE/ \
  -H "Content-Type: application/json" \
  -d '{"status": "prepared"}'


curl -X PATCH http://localhost:8000/api/v1/exercises/$EXERCISE/ \
  -H "Content-Type: application/json" \
  -d '{
    "start_date_time": "2026-09-04T14:00:00-04:00",
    "end_date_time": "2026-09-04T16:00:00-04:00"
  }'
