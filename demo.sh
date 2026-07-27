curl -X POST http://localhost:8000/api/v1/exercises/ \
    -H "Content-Type: application/json" \
    -d '{
        "title": "Incident Response Tabletop Exercise",
        "scenario": "At 0400 EST on 2026-02-26 (Friday), unknown anomalous outbound network activity was observed originating from the Expedition-0 Production environment.",
        "scheduled_start": "2026-07-27T13:00:00-04:00",
        "scheduled_end": "2026-07-27T15:00:00-04:00"
    }' -s | jq . 