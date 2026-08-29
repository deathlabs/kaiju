#!/usr/bin/env bash

set -euo pipefail

JWT=$(
  cd backend

  set -a
  source .env
  set +a

  export PGHOST=localhost
  uv run python manage.py shell -c \
    'from django.contrib.auth import get_user_model; from ninja_jwt.tokens import RefreshToken; u=get_user_model().objects.first(); print(RefreshToken.for_user(u).access_token)' \
    | tail -n 1
)

BASE_URL="${BASE_URL:-http://localhost:8000/api/v1}"
JWT="${JWT:?JWT environment variable must be set}"

PASS=0
FAIL=0
GAP=0

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

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

if curl -fsS "$BASE_URL/health/" >/dev/null; then
  pass "API health endpoint responds"
else
  fail "API health endpoint does not respond"
  exit 1
fi

# ---------------------------------------------------------------------------
# Planning Step 1
#
# Policies and plans
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

assert_nonempty \
  "$REFERENCE_ID" \
  "Reference can be created"

assert_eq \
  "$(jq -r '.title' <<< "$REFERENCE_RESPONSE")" \
  "Incident Response Plan" \
  "Reference title is stored"

REFERENCE_GET=$(
  api_curl "$BASE_URL/references/$REFERENCE_ID/"
)

assert_eq \
  "$(jq -r '.id' <<< "$REFERENCE_GET")" \
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

assert_eq \
  "$(jq -r '.title' <<< "$REFERENCE_PATCH")" \
  "Incident Response Plan (IRP)" \
  "Reference can be updated"

# ---------------------------------------------------------------------------
# Planning Steps 3-5
#
# Exercise metadata
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
      "start_date_time": "2026-09-04T13:00:00-04:00",
      "end_date_time": "2026-09-04T15:00:00-04:00"
    }'
)

EXERCISE_ID=$(jq -er '.id' <<< "$EXERCISE_RESPONSE")

assert_nonempty \
  "$EXERCISE_ID" \
  "Exercise can be created"

assert_eq \
  "$(jq -r '.title' <<< "$EXERCISE_RESPONSE")" \
  "Incident Response TTX" \
  "Exercise title is stored"

assert_eq \
  "$(jq -r '.type' <<< "$EXERCISE_RESPONSE")" \
  "discussion_and_hands_on" \
  "Planning Step 3: TTX type is stored"

assert_nonempty \
  "$(jq -r '.start_date_time' <<< "$EXERCISE_RESPONSE")" \
  "Planning Step 4: start time is stored"

assert_nonempty \
  "$(jq -r '.end_date_time' <<< "$EXERCISE_RESPONSE")" \
  "Planning Step 4: end time is stored"

assert_nonempty \
  "$(jq -r '.scenario' <<< "$EXERCISE_RESPONSE")" \
  "Planning Step 5: scenario is stored"

assert_eq \
  "$(jq -r '.status' <<< "$EXERCISE_RESPONSE")" \
  "planned" \
  "Exercise begins in planned state"

assert_nonempty \
  "$(jq -r '.facilitator_ids[0]' <<< "$EXERCISE_RESPONSE")" \
  "Exercise creator is assigned as a facilitator"

# ---------------------------------------------------------------------------
# Exercise Retrieval
# ---------------------------------------------------------------------------

section "EXERCISE RETRIEVAL"

EXERCISES=$(
  api_curl "$BASE_URL/exercises/"
)

if jq -e --arg id "$EXERCISE_ID" \
  'any(.[]; .id == $id)' \
  <<< "$EXERCISES" >/dev/null; then
  pass "Created exercise appears in exercise list"
else
  fail "Created exercise does not appear in exercise list"
fi

EXERCISE_GET=$(
  api_curl "$BASE_URL/exercises/$EXERCISE_ID/"
)

assert_eq \
  "$(jq -r '.id' <<< "$EXERCISE_GET")" \
  "$EXERCISE_ID" \
  "Exercise can be retrieved by ID"

# ---------------------------------------------------------------------------
# Exercise Updates
# ---------------------------------------------------------------------------

section "EXERCISE UPDATES"

SCHEDULE_UPDATE=$(
  api_curl \
    -X PATCH "$BASE_URL/exercises/$EXERCISE_ID/" \
    -H "Content-Type: application/json" \
    -d '{
      "start_date_time": "2026-09-04T14:00:00-04:00",
      "end_date_time": "2026-09-04T16:00:00-04:00"
    }'
)

assert_nonempty \
  "$(jq -r '.start_date_time' <<< "$SCHEDULE_UPDATE")" \
  "Exercise start time can be changed"

assert_nonempty \
  "$(jq -r '.end_date_time' <<< "$SCHEDULE_UPDATE")" \
  "Exercise end time can be changed"

api_curl \
  -X PATCH "$BASE_URL/exercises/$EXERCISE_ID/" \
  -H "Content-Type: application/json" \
  -d '{
    "start_date_time": "2026-09-04T13:00:00-04:00",
    "end_date_time": "2026-09-04T15:00:00-04:00"
  }' >/dev/null

pass "Exercise schedule can be restored"

# ---------------------------------------------------------------------------
# Planning Step 1: Exercise/Reference Relationship
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

if jq -e --arg id "$REFERENCE_ID" \
  'any(.references[]; .id == $id)' \
  <<< "$EXERCISE_REFERENCE_UPDATE" >/dev/null; then
  pass "Reference can be associated with an exercise"
else
  fail "Reference was not associated with the exercise"
fi

EXERCISE_GET=$(
  api_curl "$BASE_URL/exercises/$EXERCISE_ID/"
)

if jq -e --arg id "$REFERENCE_ID" \
  'any(.references[]; .id == $id)' \
  <<< "$EXERCISE_GET" >/dev/null; then
  pass "Exercise exposes associated references"
else
  fail "Exercise does not expose associated references"
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

assert_nonempty \
  "$OBJECTIVE_ID" \
  "Objective can be created"

assert_eq \
  "$(jq -r '.title' <<< "$OBJECTIVE_RESPONSE")" \
  "Validate Incident Response Procedures" \
  "Objective title is stored"

OBJECTIVE_GET=$(
  api_curl "$BASE_URL/objectives/$OBJECTIVE_ID/"
)

assert_eq \
  "$(jq -r '.id' <<< "$OBJECTIVE_GET")" \
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

assert_eq \
  "$(jq -r '.title' <<< "$OBJECTIVE_PATCH")" \
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

if jq -e --arg id "$OBJECTIVE_ID" \
  'any(.objectives[]; .id == $id)' \
  <<< "$EXERCISE_OBJECTIVE_UPDATE" >/dev/null; then
  pass "Objective can be associated with an exercise"
else
  fail "Objective was not associated with the exercise"
fi

EXERCISE_GET=$(
  api_curl "$BASE_URL/exercises/$EXERCISE_ID/"
)

if jq -e --arg id "$OBJECTIVE_ID" \
  'any(.objectives[]; .id == $id)' \
  <<< "$EXERCISE_GET" >/dev/null; then
  pass "Exercise exposes associated objectives"
else
  fail "Exercise does not expose associated objectives"
fi

# ---------------------------------------------------------------------------
# Planning Step 6: MSEL
# ---------------------------------------------------------------------------

section "PLANNING STEP 6: MASTER SCENARIO EVENT LIST"

if endpoint_exists "$BASE_URL/exercises/$EXERCISE_ID/events/"; then
  pass "MSEL event API is exposed"
else
  gap "Event model exists but MSEL events are not exposed by the API"
fi

# ---------------------------------------------------------------------------
# Planning Step 7: Inject Tracker
# ---------------------------------------------------------------------------

section "PLANNING STEP 7: INJECT TRACKER"

if endpoint_exists "$BASE_URL/exercises/$EXERCISE_ID/events/test/injects/"; then
  pass "Inject API is exposed"
else
  gap "Inject model exists but event injects are not exposed by the API"
fi

# ---------------------------------------------------------------------------
# Planning Step 8: Facilitator Questions
# ---------------------------------------------------------------------------

section "PLANNING STEP 8: FACILITATOR QUESTIONS"

if endpoint_exists "$BASE_URL/exercises/$EXERCISE_ID/questions/"; then
  pass "Facilitator question API is exposed"
else
  gap "FacilitatorQuestion model exists but facilitator questions are not exposed by the API"
fi

# ---------------------------------------------------------------------------
# Preparing Step 1
# ---------------------------------------------------------------------------

section "PREPARING STEP 1: RED TEAM COORDINATION"

PREP_RESPONSE=$(
  api_curl \
    -X PATCH "$BASE_URL/exercises/$EXERCISE_ID/" \
    -H "Content-Type: application/json" \
    -d '{
      "red_team_coordinated_at": "2026-09-01T10:00:00-04:00"
    }'
)

assert_nonempty \
  "$(jq -r '.red_team_coordinated_at' <<< "$PREP_RESPONSE")" \
  "Red Team coordination can be recorded"

# ---------------------------------------------------------------------------
# Preparing Steps 2: Participants and Read-Aheads
# ---------------------------------------------------------------------------

section "PREPARING STEPS 2 - 3: PARTICIPANTS AND READ-AHEADS"

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

assert_nonempty \
  "$PARTICIPANT_ID" \
  "Participant can be created"

assert_eq \
  "$(jq -r '.role' <<< "$PARTICIPANT_RESPONSE")" \
  "information_system_security_manager" \
  "Participant role is stored"

PARTICIPANTS=$(
  api_curl "$BASE_URL/exercises/$EXERCISE_ID/participants/"
)

if jq -e --arg id "$PARTICIPANT_ID" \
  'any(.[]; .id == $id)' \
  <<< "$PARTICIPANTS" >/dev/null; then
  pass "Participant appears in exercise roster"
else
  fail "Participant does not appear in exercise roster"
fi

PARTICIPANT_GET=$(
  api_curl \
    "$BASE_URL/exercises/$EXERCISE_ID/participants/$PARTICIPANT_ID/"
)

assert_eq \
  "$(jq -r '.id' <<< "$PARTICIPANT_GET")" \
  "$PARTICIPANT_ID" \
  "Participant can be retrieved by ID"

PARTICIPANT_UPDATE=$(
  api_curl \
    -X PATCH "$BASE_URL/exercises/$EXERCISE_ID/participants/$PARTICIPANT_ID/" \
    -H "Content-Type: application/json" \
    -d '{
      "role": "department_lead"
    }'
)

assert_eq \
  "$(jq -r '.role' <<< "$PARTICIPANT_UPDATE")" \
  "department_lead" \
  "Participant can be updated"

READ_AHEAD_RESPONSE=$(
  api_curl \
    -X PATCH "$BASE_URL/exercises/$EXERCISE_ID/" \
    -H "Content-Type: application/json" \
    -d '{
      "read_aheads_sent_at": "2026-09-02T08:00:00-04:00"
    }'
)

assert_nonempty \
  "$(jq -r '.read_aheads_sent_at' <<< "$READ_AHEAD_RESPONSE")" \
  "Read-ahead distribution can be recorded"

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

assert_eq \
  "$(jq -r '.status' <<< "$PREPARED_RESPONSE")" \
  "prepared" \
  "Exercise can transition to prepared"

# ---------------------------------------------------------------------------
# Executing the TTX
# ---------------------------------------------------------------------------

section "EXECUTING THE TTX"

IN_PROGRESS_RESPONSE=$(
  api_curl \
    -X PATCH "$BASE_URL/exercises/$EXERCISE_ID/" \
    -H "Content-Type: application/json" \
    -d '{
      "status": "in_progress"
    }'
)

assert_eq \
  "$(jq -r '.status' <<< "$IN_PROGRESS_RESPONSE")" \
  "in_progress" \
  "Exercise can transition to in_progress"

gap "Actual execution state for events, injects, questions, and observations is not exposed by the API"

# ---------------------------------------------------------------------------
# Assessing the TTX
# ---------------------------------------------------------------------------

section "ASSESSING THE TTX"

COMPLETED_RESPONSE=$(
  api_curl \
    -X PATCH "$BASE_URL/exercises/$EXERCISE_ID/" \
    -H "Content-Type: application/json" \
    -d '{
      "status": "completed"
    }'
)

assert_eq \
  "$(jq -r '.status' <<< "$COMPLETED_RESPONSE")" \
  "completed" \
  "Exercise can transition to completed"

FINAL_EXERCISE=$(
  api_curl "$BASE_URL/exercises/$EXERCISE_ID/"
)

assert_nonempty \
  "$(jq -r '.scenario' <<< "$FINAL_EXERCISE")" \
  "AAR source data: scenario is available"

assert_nonempty \
  "$(jq -r '.start_date_time' <<< "$FINAL_EXERCISE")" \
  "AAR source data: start time is available"

assert_nonempty \
  "$(jq -r '.end_date_time' <<< "$FINAL_EXERCISE")" \
  "AAR source data: end time is available"

gap "Sustainments and improvements are not exposed by the API"
gap "AAR generation and archival are not exposed by the API"

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
printf "API gaps            : %d\n" "$GAP"

printf "\nExercise ID:  %s\n" "$EXERCISE_ID"
printf "Objective ID: %s\n" "$OBJECTIVE_ID"
printf "Reference ID: %s\n" "$REFERENCE_ID"

if (( FAIL > 0 )); then
  printf "\nRESULT: One or more implemented API capabilities failed.\n"
  exit 1
fi

if (( GAP > 0 )); then
  printf "\nRESULT: Existing API works, but does not completely implement a TTX workflow.\n"
  exit 2
fi

printf "\nRESULT: API completely implements a TTX workflow.\n"
exit 0
