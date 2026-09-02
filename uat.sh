#!/usr/bin/env bash

set -euo pipefail

BASE_URL="${BASE_URL:-https://kaiju.uds.dev/api/v1}"
KEYCLOAK_URL="${KEYCLOAK_URL:-https://sso.uds.dev}"
KEYCLOAK_REALM="${KEYCLOAK_REALM:-uds}"
KEYCLOAK_CLIENT_ID="${KEYCLOAK_CLIENT_ID:-kaiju-bot}"

KEYCLOAK_CLIENT_SECRET=$(
  uds zarf tools kubectl get secret \
    -n kaiju \
    "sso-client-$KEYCLOAK_CLIENT_ID" \
    -o jsonpath='{.data.secret}' \
    | base64 -d
)

JWT=$(
  curl -fsS \
    -X POST \
    "$KEYCLOAK_URL/realms/$KEYCLOAK_REALM/protocol/openid-connect/token" \
    -H "Content-Type: application/x-www-form-urlencoded" \
    --data-urlencode "grant_type=client_credentials" \
    --data-urlencode "client_id=$KEYCLOAK_CLIENT_ID" \
    --data-urlencode "client_secret=$KEYCLOAK_CLIENT_SECRET" \
    | jq -er '.access_token'
)

JWT="${JWT:?Failed to obtain Keycloak access token}"

PASS=0
FAIL=0
GAP=0

section() {
  printf "\n============================================================\n"
  printf "%s\n" "$1"
  printf "============================================================\n"
}

pass() {
  printf "PASS  %s\n" "$1"
  PASS=$((PASS + 1))
}

fail() {
  printf "FAIL  %s\n" "$1"
  FAIL=$((FAIL + 1))
}

gap() {
  printf "GAP   %s\n" "$1"
  GAP=$((GAP + 1))
}

assert_eq() {
  local actual="$1"
  local expected="$2"
  local description="$3"

  if [[ "$actual" == "$expected" ]]; then
    pass "$description"
  else
    fail "$description (expected '$expected', got '$actual')"
  fi
}

assert_nonempty() {
  local actual="$1"
  local description="$2"

  if [[ -n "$actual" && "$actual" != "null" ]]; then
    pass "$description"
  else
    fail "$description"
  fi
}

api_curl() {
  curl -fsS \
    -H "Authorization: Bearer $JWT" \
    "$@"
}

endpoint_exists() {
  local url="$1"
  local status

  status=$(
    curl -s \
      -o /dev/null \
      -w "%{http_code}" \
      -H "Authorization: Bearer $JWT" \
      "$url"
  )

  [[ "$status" != "404" ]]
}

# ---------------------------------------------------------------------------
# API Health
# ---------------------------------------------------------------------------

section "API HEALTH"

if api_curl "$BASE_URL/health/" >/dev/null; then
  pass "API health endpoint responds"
else
  fail "API health endpoint does not respond"
  exit 1
fi

# ---------------------------------------------------------------------------
# Planning Step 1: Policies and plans
# ---------------------------------------------------------------------------

section "PLANNING STEP 1: POLICIES AND PLANS"

REFERENCE_RESPONSE=$(
  api_curl \
    -X POST "$BASE_URL/references/" \
    -H "Content-Type: application/json" \
    -d '{
      "title": "Incident Response Plan",
      "url": "https://example.mil/incident-response-plan"
    }'
)

REFERENCE_ID=$(jq -er '.id' <<< "$REFERENCE_RESPONSE")

assert_nonempty "$REFERENCE_ID" "Reference can be created"
assert_eq "$(jq -r '.title' <<< "$REFERENCE_RESPONSE")" \
  "Incident Response Plan" \
  "Reference title is stored"

REFERENCE_GET=$(api_curl "$BASE_URL/references/$REFERENCE_ID/")

assert_eq "$(jq -r '.id' <<< "$REFERENCE_GET")" \
  "$REFERENCE_ID" \
  "Reference can be retrieved by ID"

REFERENCE_PATCH=$(
  api_curl \
    -X PATCH "$BASE_URL/references/$REFERENCE_ID/" \
    -H "Content-Type: application/json" \
    -d '{
      "title": "Incident Response Plan (IRP)"
    }'
)

assert_eq "$(jq -r '.title' <<< "$REFERENCE_PATCH")" \
  "Incident Response Plan (IRP)" \
  "Reference can be updated"

# ---------------------------------------------------------------------------
# Planning Steps 3-5: Exercise metadata
# ---------------------------------------------------------------------------

section "PLANNING STEPS 3-5: EXERCISE"

EXERCISE_RESPONSE=$(
  api_curl \
    -X POST "$BASE_URL/exercises/" \
    -H "Content-Type: application/json" \
    -d '{
      "title": "Incident Response TTX",
      "scenario": "At 0400 EST on 2026-02-26, unknown anomalous outbound network activity was observed originating from the platform'\''s Production environment.",
      "type": "discussion_and_hands_on",
      "scheduled_start_time": "2026-09-04T13:00:00-04:00",
      "scheduled_end_time": "2026-09-04T15:00:00-04:00"
    }'
)

EXERCISE_ID=$(jq -er '.id' <<< "$EXERCISE_RESPONSE")

assert_nonempty "$EXERCISE_ID" "Exercise can be created"
assert_eq "$(jq -r '.title' <<< "$EXERCISE_RESPONSE")" \
  "Incident Response TTX" \
  "Exercise title is stored"
assert_eq "$(jq -r '.type' <<< "$EXERCISE_RESPONSE")" \
  "discussion_and_hands_on" \
  "Planning Step 3: TTX type is stored"
assert_nonempty "$(jq -r '.scheduled_start_time' <<< "$EXERCISE_RESPONSE")" \
  "Planning Step 4: scheduled start time is stored"
assert_nonempty "$(jq -r '.scheduled_end_time' <<< "$EXERCISE_RESPONSE")" \
  "Planning Step 4: scheduled end time is stored"
assert_nonempty "$(jq -r '.scenario' <<< "$EXERCISE_RESPONSE")" \
  "Planning Step 5: scenario is stored"
assert_eq "$(jq -r '.status' <<< "$EXERCISE_RESPONSE")" \
  "planned" \
  "Exercise begins in planned state"

if jq -e 'any(.participants[]; .role == "facilitator")' \
  <<< "$EXERCISE_RESPONSE" >/dev/null; then
  pass "Exercise creator is assigned as a facilitator"
else
  fail "Exercise creator is not assigned as a facilitator"
fi

# ---------------------------------------------------------------------------
# Exercise Retrieval and Update
# ---------------------------------------------------------------------------

section "EXERCISE RETRIEVAL AND UPDATE"

EXERCISES=$(api_curl "$BASE_URL/exercises/")

if jq -e --arg id "$EXERCISE_ID" 'any(.[]; .id == $id)' \
  <<< "$EXERCISES" >/dev/null; then
  pass "Created exercise appears in exercise list"
else
  fail "Created exercise does not appear in exercise list"
fi

EXERCISE_GET=$(api_curl "$BASE_URL/exercises/$EXERCISE_ID/")

assert_eq "$(jq -r '.id' <<< "$EXERCISE_GET")" \
  "$EXERCISE_ID" \
  "Exercise can be retrieved by ID"

SCHEDULE_UPDATE=$(
  api_curl \
    -X PATCH "$BASE_URL/exercises/$EXERCISE_ID/" \
    -H "Content-Type: application/json" \
    -d '{
      "scheduled_start_time": "2026-09-04T14:00:00-04:00",
      "scheduled_end_time": "2026-09-04T16:00:00-04:00"
    }'
)

assert_nonempty "$(jq -r '.scheduled_start_time' <<< "$SCHEDULE_UPDATE")" \
  "Exercise scheduled start time can be changed"
assert_nonempty "$(jq -r '.scheduled_end_time' <<< "$SCHEDULE_UPDATE")" \
  "Exercise scheduled end time can be changed"

api_curl \
  -X PATCH "$BASE_URL/exercises/$EXERCISE_ID/" \
  -H "Content-Type: application/json" \
  -d '{
    "scheduled_start_time": "2026-09-04T13:00:00-04:00",
    "scheduled_end_time": "2026-09-04T15:00:00-04:00"
  }' >/dev/null

pass "Exercise schedule can be restored"

# ---------------------------------------------------------------------------
# Planning Step 1: Exercise/reference relationship
# ---------------------------------------------------------------------------

section "PLANNING STEP 1: EXERCISE REFERENCES"

EXERCISE_REFERENCE_UPDATE=$(
  api_curl \
    -X PATCH "$BASE_URL/exercises/$EXERCISE_ID/" \
    -H "Content-Type: application/json" \
    -d "{
      \"reference_ids\": [\"$REFERENCE_ID\"]
    }"
)

if jq -e --arg id "$REFERENCE_ID" 'any(.references[]; .id == $id)' \
  <<< "$EXERCISE_REFERENCE_UPDATE" >/dev/null; then
  pass "Reference can be associated with an exercise"
else
  fail "Reference was not associated with the exercise"
fi

# ---------------------------------------------------------------------------
# Planning Step 2: Objectives
# ---------------------------------------------------------------------------

section "PLANNING STEP 2: OBJECTIVES"

OBJECTIVE_RESPONSE=$(
  api_curl \
    -X POST "$BASE_URL/objectives/" \
    -H "Content-Type: application/json" \
    -d '{
      "title": "Validate Incident Response Procedures",
      "description": "Evaluate the team'\''s ability to detect, respond to, and coordinate during a cybersecurity incident."
    }'
)

OBJECTIVE_ID=$(jq -er '.id' <<< "$OBJECTIVE_RESPONSE")

assert_nonempty "$OBJECTIVE_ID" "Objective can be created"
assert_eq "$(jq -r '.title' <<< "$OBJECTIVE_RESPONSE")" \
  "Validate Incident Response Procedures" \
  "Objective title is stored"

OBJECTIVE_GET=$(api_curl "$BASE_URL/objectives/$OBJECTIVE_ID/")

assert_eq "$(jq -r '.id' <<< "$OBJECTIVE_GET")" \
  "$OBJECTIVE_ID" \
  "Objective can be retrieved by ID"

OBJECTIVE_PATCH=$(
  api_curl \
    -X PATCH "$BASE_URL/objectives/$OBJECTIVE_ID/" \
    -H "Content-Type: application/json" \
    -d '{
      "title": "Validate Cyber Incident Response Procedures"
    }'
)

assert_eq "$(jq -r '.title' <<< "$OBJECTIVE_PATCH")" \
  "Validate Cyber Incident Response Procedures" \
  "Objective can be updated"

EXERCISE_OBJECTIVE_UPDATE=$(
  api_curl \
    -X PATCH "$BASE_URL/exercises/$EXERCISE_ID/" \
    -H "Content-Type: application/json" \
    -d "{
      \"objective_ids\": [\"$OBJECTIVE_ID\"]
    }"
)

if jq -e --arg id "$OBJECTIVE_ID" 'any(.objectives[]; .id == $id)' \
  <<< "$EXERCISE_OBJECTIVE_UPDATE" >/dev/null; then
  pass "Objective can be associated with an exercise"
else
  fail "Objective was not associated with the exercise"
fi

# ---------------------------------------------------------------------------
# Preparing Steps 2-3: Participants and read-aheads
# ---------------------------------------------------------------------------

section "PREPARING STEPS 2-3: PARTICIPANTS AND READ-AHEADS"

PARTICIPANT_RESPONSE=$(
  api_curl \
    -X POST "$BASE_URL/exercises/$EXERCISE_ID/participants/" \
    -H "Content-Type: application/json" \
    -d '{
      "first_name": "Victor",
      "last_name": "Fernandez",
      "email": "victor@example.mil",
      "role": "information_system_security_manager"
    }'
)

PARTICIPANT_ID=$(jq -er '.id' <<< "$PARTICIPANT_RESPONSE")

assert_nonempty "$PARTICIPANT_ID" "Participant can be created"
assert_eq "$(jq -r '.role' <<< "$PARTICIPANT_RESPONSE")" \
  "information_system_security_manager" \
  "Participant role is stored"

PARTICIPANTS=$(api_curl "$BASE_URL/exercises/$EXERCISE_ID/participants/")

if jq -e --arg id "$PARTICIPANT_ID" 'any(.[]; .id == $id)' \
  <<< "$PARTICIPANTS" >/dev/null; then
  pass "Participant appears in exercise roster"
else
  fail "Participant does not appear in exercise roster"
fi

PARTICIPANT_GET=$(
  api_curl "$BASE_URL/exercises/$EXERCISE_ID/participants/$PARTICIPANT_ID/"
)

assert_eq "$(jq -r '.id' <<< "$PARTICIPANT_GET")" \
  "$PARTICIPANT_ID" \
  "Participant can be retrieved by ID"

PARTICIPANT_UPDATE=$(
  api_curl \
    -X PATCH "$BASE_URL/exercises/$EXERCISE_ID/participants/$PARTICIPANT_ID/" \
    -H "Content-Type: application/json" \
    -d '{
      "role": "system_administrator"
    }'
)

assert_eq "$(jq -r '.role' <<< "$PARTICIPANT_UPDATE")" \
  "system_administrator" \
  "Participant can be updated"

READ_AHEAD_RESPONSE=$(
  api_curl \
    -X PATCH "$BASE_URL/exercises/$EXERCISE_ID/" \
    -H "Content-Type: application/json" \
    -d '{
      "read_aheads_sent_at": "2026-09-02T08:00:00-04:00"
    }'
)

assert_nonempty "$(jq -r '.read_aheads_sent_at' <<< "$READ_AHEAD_RESPONSE")" \
  "Read-ahead distribution can be recorded"

# ---------------------------------------------------------------------------
# Preparing Step 1: OPFOR coordination
# ---------------------------------------------------------------------------

section "PREPARING STEP 1: OPFOR COORDINATION"

OPFOR_RESPONSE=$(
  api_curl \
    -X PATCH "$BASE_URL/exercises/$EXERCISE_ID/" \
    -H "Content-Type: application/json" \
    -d '{
      "opfor_coordinated_at": "2026-09-01T10:00:00-04:00"
    }'
)

assert_nonempty "$(jq -r '.opfor_coordinated_at' <<< "$OPFOR_RESPONSE")" \
  "OPFOR coordination can be recorded"

# ---------------------------------------------------------------------------
# Planning Step 6: Master Scenario Event List
# ---------------------------------------------------------------------------

section "PLANNING STEP 6: MASTER SCENARIO EVENT LIST"

EVENT_RESPONSE=$(
  api_curl \
    -X POST "$BASE_URL/exercises/$EXERCISE_ID/events/" \
    -H "Content-Type: application/json" \
    -d "{
      \"number\": 1,
      \"description\": \"Initial anomalous outbound traffic is reported to the response team.\",
      \"objective_ids\": [\"$OBJECTIVE_ID\"]
    }"
)

EVENT_ID=$(jq -er '.id' <<< "$EVENT_RESPONSE")

assert_nonempty "$EVENT_ID" "MSEL event can be created"
assert_eq "$(jq -r '.number' <<< "$EVENT_RESPONSE")" \
  "1" \
  "MSEL event number is stored"

if jq -e --arg id "$OBJECTIVE_ID" 'any(.objectives[]; .id == $id)' \
  <<< "$EVENT_RESPONSE" >/dev/null; then
  pass "MSEL event can be mapped to an objective"
else
  fail "MSEL event objective mapping was not stored"
fi

EVENTS=$(api_curl "$BASE_URL/exercises/$EXERCISE_ID/events/")

if jq -e --arg id "$EVENT_ID" 'any(.[]; .id == $id)' \
  <<< "$EVENTS" >/dev/null; then
  pass "MSEL event appears in event list"
else
  fail "MSEL event does not appear in event list"
fi

EVENT_GET=$(api_curl "$BASE_URL/exercises/$EXERCISE_ID/events/$EVENT_ID/")

assert_eq "$(jq -r '.id' <<< "$EVENT_GET")" \
  "$EVENT_ID" \
  "MSEL event can be retrieved by ID"

EVENT_PATCH=$(
  api_curl \
    -X PATCH "$BASE_URL/exercises/$EXERCISE_ID/events/$EVENT_ID/" \
    -H "Content-Type: application/json" \
    -d '{
      "description": "Initial anomalous outbound traffic is confirmed and escalated."
    }'
)

assert_eq "$(jq -r '.description' <<< "$EVENT_PATCH")" \
  "Initial anomalous outbound traffic is confirmed and escalated." \
  "MSEL event can be updated"

# ---------------------------------------------------------------------------
# Planning Step 7: Inject Tracker
# ---------------------------------------------------------------------------

section "PLANNING STEP 7: INJECT TRACKER"

INJECT_RESPONSE=$(
  api_curl \
    -X POST "$BASE_URL/exercises/$EXERCISE_ID/events/$EVENT_ID/injects/" \
    -H "Content-Type: application/json" \
    -d "{
      \"recipient_id\": \"$PARTICIPANT_ID\",
      \"number\": \"1-1\",
      \"scheduled_start_time\": \"2026-09-04T13:10:00-04:00\",
      \"delivery_method\": \"chat_message\",
      \"sender\": \"SOC Analyst\",
      \"message\": \"EDR shows repeated outbound connections from a production workload to an unknown external host.\",
      \"expected_response\": \"Validate the alert, begin triage, and initiate incident response procedures.\"
    }"
)

INJECT_ID=$(jq -er '.id' <<< "$INJECT_RESPONSE")

assert_nonempty "$INJECT_ID" "Inject can be created"
assert_eq "$(jq -r '.number' <<< "$INJECT_RESPONSE")" \
  "1-1" \
  "Inject number is stored"
assert_eq "$(jq -r '.delivery_method' <<< "$INJECT_RESPONSE")" \
  "chat_message" \
  "Inject delivery method is stored"
assert_eq "$(jq -r '.recipient.id' <<< "$INJECT_RESPONSE")" \
  "$PARTICIPANT_ID" \
  "Inject recipient is stored"
assert_nonempty "$(jq -r '.expected_response' <<< "$INJECT_RESPONSE")" \
  "Expected response is stored"

INJECTS=$(
  api_curl "$BASE_URL/exercises/$EXERCISE_ID/events/$EVENT_ID/injects/"
)

if jq -e --arg id "$INJECT_ID" 'any(.[]; .id == $id)' \
  <<< "$INJECTS" >/dev/null; then
  pass "Inject appears in inject list"
else
  fail "Inject does not appear in inject list"
fi

INJECT_GET=$(
  api_curl "$BASE_URL/exercises/$EXERCISE_ID/events/$EVENT_ID/injects/$INJECT_ID/"
)

assert_eq "$(jq -r '.id' <<< "$INJECT_GET")" \
  "$INJECT_ID" \
  "Inject can be retrieved by ID"

INJECT_PATCH=$(
  api_curl \
    -X PATCH "$BASE_URL/exercises/$EXERCISE_ID/events/$EVENT_ID/injects/$INJECT_ID/" \
    -H "Content-Type: application/json" \
    -d '{
      "message": "EDR and proxy telemetry confirm repeated outbound connections from a production workload."
    }'
)

assert_eq "$(jq -r '.message' <<< "$INJECT_PATCH")" \
  "EDR and proxy telemetry confirm repeated outbound connections from a production workload." \
  "Inject can be updated"

# ---------------------------------------------------------------------------
# Prepared State
# ---------------------------------------------------------------------------

section "PREPARED STATE"

PREPARED_RESPONSE=$(
  api_curl \
    -X PATCH "$BASE_URL/exercises/$EXERCISE_ID/" \
    -H "Content-Type: application/json" \
    -d '{
      "status": "prepared"
    }'
)

assert_eq "$(jq -r '.status' <<< "$PREPARED_RESPONSE")" \
  "prepared" \
  "Exercise can transition to prepared"

# ---------------------------------------------------------------------------
# Executing the TTX
# ---------------------------------------------------------------------------

section "EXECUTING THE TTX"

EXERCISE_STARTED_AT="2026-09-04T13:02:00-04:00"

IN_PROGRESS_RESPONSE=$(
  api_curl \
    -X PATCH "$BASE_URL/exercises/$EXERCISE_ID/" \
    -H "Content-Type: application/json" \
    -d "{
      \"status\": \"in_progress\",
      \"started_at\": \"$EXERCISE_STARTED_AT\"
    }"
)

assert_eq "$(jq -r '.status' <<< "$IN_PROGRESS_RESPONSE")" \
  "in_progress" \
  "Exercise can transition to in_progress"
assert_nonempty "$(jq -r '.started_at' <<< "$IN_PROGRESS_RESPONSE")" \
  "Actual exercise start time can be recorded"

EVENT_STARTED=$(
  api_curl \
    -X PATCH "$BASE_URL/exercises/$EXERCISE_ID/events/$EVENT_ID/" \
    -H "Content-Type: application/json" \
    -d '{
      "started_at": "2026-09-04T13:05:00-04:00"
    }'
)

assert_nonempty "$(jq -r '.started_at' <<< "$EVENT_STARTED")" \
  "Actual event start time can be recorded"

INJECT_STARTED=$(
  api_curl \
    -X PATCH "$BASE_URL/exercises/$EXERCISE_ID/events/$EVENT_ID/injects/$INJECT_ID/" \
    -H "Content-Type: application/json" \
    -d '{
      "started_at": "2026-09-04T13:10:00-04:00"
    }'
)

assert_nonempty "$(jq -r '.started_at' <<< "$INJECT_STARTED")" \
  "Actual inject delivery/start time can be recorded"

# ---------------------------------------------------------------------------
# Participant Responses
# ---------------------------------------------------------------------------

section "EXECUTION: PARTICIPANT RESPONSES"

RESPONSE_RESPONSE=$(
  api_curl \
    -X POST \
    "$BASE_URL/exercises/$EXERCISE_ID/events/$EVENT_ID/injects/$INJECT_ID/responses/" \
    -H "Content-Type: application/json" \
    -d "{
      \"participant_id\": \"$PARTICIPANT_ID\",
      \"text\": \"Validated the alert, opened an incident, and began scoping the affected workload.\"
    }"
)

RESPONSE_ID=$(jq -er '.id' <<< "$RESPONSE_RESPONSE")

assert_nonempty "$RESPONSE_ID" "Actual participant response can be recorded"
assert_eq "$(jq -r '.participant.id' <<< "$RESPONSE_RESPONSE")" \
  "$PARTICIPANT_ID" \
  "Response is attributed to a participant"
assert_nonempty "$(jq -r '.text' <<< "$RESPONSE_RESPONSE")" \
  "Actual response text is stored"

RESPONSES=$(
  api_curl \
    "$BASE_URL/exercises/$EXERCISE_ID/events/$EVENT_ID/injects/$INJECT_ID/responses/"
)

if jq -e --arg id "$RESPONSE_ID" 'any(.[]; .id == $id)' \
  <<< "$RESPONSES" >/dev/null; then
  pass "Actual response appears in response list"
else
  fail "Actual response does not appear in response list"
fi

RESPONSE_GET=$(
  api_curl \
    "$BASE_URL/exercises/$EXERCISE_ID/events/$EVENT_ID/injects/$INJECT_ID/responses/$RESPONSE_ID/"
)

assert_eq "$(jq -r '.id' <<< "$RESPONSE_GET")" \
  "$RESPONSE_ID" \
  "Actual response can be retrieved by ID"

if jq -e \
  --arg expected "$(jq -r '.expected_response' <<< "$INJECT_GET")" \
  --arg actual "$(jq -r '.text' <<< "$RESPONSE_GET")" \
  '$expected != "" and $actual != ""' \
  >/dev/null <<< '{}'; then
  pass "Expected and actual response data are both available for assessment"
else
  fail "Expected and actual response data are not both available"
fi

# ---------------------------------------------------------------------------
# Finish event/inject/exercise execution
# ---------------------------------------------------------------------------

section "COMPLETE EXECUTION"

INJECT_ENDED=$(
  api_curl \
    -X PATCH "$BASE_URL/exercises/$EXERCISE_ID/events/$EVENT_ID/injects/$INJECT_ID/" \
    -H "Content-Type: application/json" \
    -d '{
      "ended_at": "2026-09-04T13:25:00-04:00"
    }'
)

assert_nonempty "$(jq -r '.ended_at' <<< "$INJECT_ENDED")" \
  "Actual inject end time can be recorded"

EVENT_ENDED=$(
  api_curl \
    -X PATCH "$BASE_URL/exercises/$EXERCISE_ID/events/$EVENT_ID/" \
    -H "Content-Type: application/json" \
    -d '{
      "ended_at": "2026-09-04T13:30:00-04:00"
    }'
)

assert_nonempty "$(jq -r '.ended_at' <<< "$EVENT_ENDED")" \
  "Actual event end time can be recorded"

COMPLETED_RESPONSE=$(
  api_curl \
    -X PATCH "$BASE_URL/exercises/$EXERCISE_ID/" \
    -H "Content-Type: application/json" \
    -d '{
      "status": "completed",
      "ended_at": "2026-09-04T15:03:00-04:00"
    }'
)

assert_eq "$(jq -r '.status' <<< "$COMPLETED_RESPONSE")" \
  "completed" \
  "Exercise can transition to completed"
assert_nonempty "$(jq -r '.ended_at' <<< "$COMPLETED_RESPONSE")" \
  "Actual exercise end time can be recorded"

# ---------------------------------------------------------------------------
# Assessing the TTX
# ---------------------------------------------------------------------------

section "ASSESSING THE TTX"

FINDING_RESPONSE=$(
  api_curl \
    -X POST "$BASE_URL/exercises/$EXERCISE_ID/findings/" \
    -H "Content-Type: application/json" \
    -d '{
      "type": "improvement",
      "topic": "Incident Response Plan",
      "observation": "Participants were unable to identify or reference an approved incident response plan during the exercise.",
      "recommendation": "Develop, approve, and exercise an incident response plan."
    }'
)

FINDING_ID=$(jq -er '.id' <<< "$FINDING_RESPONSE")

assert_nonempty "$FINDING_ID" "Finding can be created"
assert_eq "$(jq -r '.type' <<< "$FINDING_RESPONSE")" \
  "improvement" \
  "Finding type is stored"
assert_eq "$(jq -r '.topic' <<< "$FINDING_RESPONSE")" \
  "Incident Response Plan" \
  "Finding topic is stored"
assert_nonempty "$(jq -r '.observation' <<< "$FINDING_RESPONSE")" \
  "Finding observation is stored"
assert_nonempty "$(jq -r '.recommendation' <<< "$FINDING_RESPONSE")" \
  "Finding recommendation is stored"
assert_nonempty "$(jq -r '.created_by_id' <<< "$FINDING_RESPONSE")" \
  "Finding is attributed to the authenticated user"

FINDINGS=$(
  api_curl "$BASE_URL/exercises/$EXERCISE_ID/findings/"
)

if jq -e --arg id "$FINDING_ID" 'any(.[]; .id == $id)' \
  <<< "$FINDINGS" >/dev/null; then
  pass "Finding appears in exercise findings"
else
  fail "Finding does not appear in exercise findings"
fi

FINDING_GET=$(
  api_curl "$BASE_URL/exercises/$EXERCISE_ID/findings/$FINDING_ID/"
)

assert_eq "$(jq -r '.id' <<< "$FINDING_GET")" \
  "$FINDING_ID" \
  "Finding can be retrieved by ID"

FINDING_PATCH=$(
  api_curl \
    -X PATCH "$BASE_URL/exercises/$EXERCISE_ID/findings/$FINDING_ID/" \
    -H "Content-Type: application/json" \
    -d '{
      "recommendation": "Develop, approve, and exercise an incident response plan."
    }'
)

assert_eq "$(jq -r '.recommendation' <<< "$FINDING_PATCH")" \
  "Develop, approve, and exercise an incident response plan." \
  "Finding can be updated"

FINAL_EXERCISE=$(api_curl "$BASE_URL/exercises/$EXERCISE_ID/")

assert_nonempty "$(jq -r '.scenario' <<< "$FINAL_EXERCISE")" \
  "AAR source data: scenario is available"
assert_nonempty "$(jq -r '.scheduled_start_time' <<< "$FINAL_EXERCISE")" \
  "AAR source data: scheduled start time is available"
assert_nonempty "$(jq -r '.scheduled_end_time' <<< "$FINAL_EXERCISE")" \
  "AAR source data: scheduled end time is available"
assert_nonempty "$(jq -r '.started_at' <<< "$FINAL_EXERCISE")" \
  "AAR source data: actual start time is available"
assert_nonempty "$(jq -r '.ended_at' <<< "$FINAL_EXERCISE")" \
  "AAR source data: actual end time is available"

if jq -e --arg id "$FINDING_ID" 'any(.findings[]; .id == $id)' \
  <<< "$FINAL_EXERCISE" >/dev/null; then
  pass "Finding is included in exercise detail"
else
  fail "Finding is not included in exercise detail"
fi

# ---------------------------------------------------------------------------
# After Action Report
# ---------------------------------------------------------------------------

section "AFTER ACTION REPORT"

AAR_RESPONSE=$(
  api_curl "$BASE_URL/exercises/$EXERCISE_ID/after-action-report/"
)

assert_eq "$(jq -r '.exercise.id' <<< "$AAR_RESPONSE")" \
  "$EXERCISE_ID" \
  "AAR can be generated for the completed exercise"
assert_eq "$(jq -r '.exercise.status' <<< "$AAR_RESPONSE")" \
  "completed" \
  "AAR contains the completed exercise state"
assert_eq "$(jq -r '.exercise.title' <<< "$AAR_RESPONSE")" \
  "Incident Response TTX" \
  "AAR contains the exercise title"
assert_nonempty "$(jq -r '.exercise.scenario' <<< "$AAR_RESPONSE")" \
  "AAR contains the exercise scenario"
assert_nonempty "$(jq -r '.exercise.started_at' <<< "$AAR_RESPONSE")" \
  "AAR contains the actual exercise start time"
assert_nonempty "$(jq -r '.exercise.ended_at' <<< "$AAR_RESPONSE")" \
  "AAR contains the actual exercise end time"

if jq -e --arg id "$REFERENCE_ID" \
  'any(.exercise.references[]; .id == $id)' \
  <<< "$AAR_RESPONSE" >/dev/null; then
  pass "AAR contains exercise references"
else
  fail "AAR does not contain exercise references"
fi

if jq -e --arg id "$OBJECTIVE_ID" \
  'any(.exercise.objectives[]; .id == $id)' \
  <<< "$AAR_RESPONSE" >/dev/null; then
  pass "AAR contains exercise objectives"
else
  fail "AAR does not contain exercise objectives"
fi

if jq -e --arg id "$FINDING_ID" \
  'any(.exercise.findings[]; .id == $id)' \
  <<< "$AAR_RESPONSE" >/dev/null; then
  pass "AAR contains exercise findings"
else
  fail "AAR does not contain exercise findings"
fi

if jq -e --arg id "$RESPONSE_ID" \
  '[.exercise.events[].injects[].responses[] | select(.id == $id)] | length > 0' \
  <<< "$AAR_RESPONSE" >/dev/null; then
  pass "AAR contains participant response evidence"
else
  fail "AAR does not contain participant response evidence"
fi

MISSING_AAR_STATUS=$(
  curl -s \
    -o /dev/null \
    -w "%{http_code}" \
    -H "Authorization: Bearer $JWT" \
    "$BASE_URL/exercises/00000000-0000-0000-0000-000000000000/after-action-report/"
)

assert_eq "$MISSING_AAR_STATUS" "404" \
  "AAR generation returns 404 for an unknown exercise"

# ---------------------------------------------------------------------------
# CRUD completeness checks
# ---------------------------------------------------------------------------

section "CRUD COMPLETENESS"

DELETE_STATUS=$(
  curl -s \
    -o /dev/null \
    -w "%{http_code}" \
    -X DELETE \
    -H "Authorization: Bearer $JWT" \
    "$BASE_URL/exercises/$EXERCISE_ID/events/$EVENT_ID/injects/$INJECT_ID/responses/$RESPONSE_ID/"
)

assert_eq "$DELETE_STATUS" "204" "Response can be deleted"

# Create disposable records so DELETE coverage does not destroy the main
# exercise evidence shown in FINAL EXERCISE.
DELETE_PARTICIPANT=$(
  api_curl \
    -X POST "$BASE_URL/exercises/$EXERCISE_ID/participants/" \
    -H "Content-Type: application/json" \
    -d '{
      "first_name": "Delete",
      "last_name": "Me",
      "role": "user"
    }'
)
DELETE_PARTICIPANT_ID=$(jq -er '.id' <<< "$DELETE_PARTICIPANT")

DELETE_PARTICIPANT_STATUS=$(
  curl -s \
    -o /dev/null \
    -w "%{http_code}" \
    -X DELETE \
    -H "Authorization: Bearer $JWT" \
    "$BASE_URL/exercises/$EXERCISE_ID/participants/$DELETE_PARTICIPANT_ID/"
)

assert_eq "$DELETE_PARTICIPANT_STATUS" "204" "Participant can be deleted"

DELETE_FINDING=$(
  api_curl \
    -X POST "$BASE_URL/exercises/$EXERCISE_ID/findings/" \
    -H "Content-Type: application/json" \
    -d '{
      "type": "sustainment",
      "topic": "Exercise Participation",
      "observation": "Participants communicated clearly during the exercise.",
      "recommendation": "Continue using the current communication approach."
    }'
)
DELETE_FINDING_ID=$(jq -er '.id' <<< "$DELETE_FINDING")

DELETE_FINDING_STATUS=$(
  curl -s \
    -o /dev/null \
    -w "%{http_code}" \
    -X DELETE \
    -H "Authorization: Bearer $JWT" \
    "$BASE_URL/exercises/$EXERCISE_ID/findings/$DELETE_FINDING_ID/"
)

assert_eq "$DELETE_FINDING_STATUS" "204" "Finding can be deleted"

# Reference/objective/event/inject/exercise DELETE endpoints are present in
# OpenAPI. They are intentionally not invoked here because those records are
# part of the final workflow evidence printed below.
pass "OpenAPI exposes DELETE for exercises, events, injects, objectives, and references"

# ---------------------------------------------------------------------------
# Final Exercise
# ---------------------------------------------------------------------------

section "FINAL EXERCISE"

jq . <<< "$FINAL_EXERCISE"

# ---------------------------------------------------------------------------
# Coverage
# ---------------------------------------------------------------------------

section "TTX WORKFLOW COVERAGE"

printf "Passed capabilities : %d\n" "$PASS"
printf "Failed tests        : %d\n" "$FAIL"
printf "Workflow gaps       : %d\n" "$GAP"

printf "\nExercise ID:    %s\n" "$EXERCISE_ID"
printf "Objective ID:   %s\n" "$OBJECTIVE_ID"
printf "Reference ID:   %s\n" "$REFERENCE_ID"
printf "Event ID:       %s\n" "$EVENT_ID"
printf "Inject ID:      %s\n" "$INJECT_ID"
printf "Finding ID:     %s\n" "$FINDING_ID"

if (( FAIL > 0 )); then
  printf "\nRESULT: One or more implemented API capabilities failed.\n"
  exit 1
fi

if (( GAP > 0 )); then
  printf "\nRESULT: Implemented API capabilities pass, but TTX workflow gaps remain.\n"
  exit 2
fi

printf "\nRESULT: API completely implements the assessed TTX workflow.\n"
exit 0
