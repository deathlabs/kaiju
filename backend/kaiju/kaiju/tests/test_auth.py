# Standard library imports.
import json
from datetime import UTC, datetime, timedelta
from pathlib import Path
from tempfile import TemporaryDirectory
from uuid import uuid4

# Third party imports.
from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.asymmetric import rsa
from django.contrib.auth import get_user_model
from django.http import HttpResponse
from django.test import TestCase, override_settings
from jwt import encode

# Local imports.
from exercises.models import Event, Exercise, Inject, Participant
from objectives.models import Objective
from references.models import Reference


class AuthenticationTests(TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        super().setUpClass()
        cls.temporary_directory = TemporaryDirectory()
        cls.private_key = rsa.generate_private_key(public_exponent=65537, key_size=2048)
        public_key = cls.private_key.public_key().public_bytes(
            encoding=serialization.Encoding.PEM,
            format=serialization.PublicFormat.SubjectPublicKeyInfo,
        )
        cls.public_key_path = Path(cls.temporary_directory.name) / "public-key.pem"
        cls.public_key_path.write_bytes(public_key)

    @classmethod
    def tearDownClass(cls) -> None:
        cls.temporary_directory.cleanup()
        super().tearDownClass()

    def _token(
        self,
        *,
        private_key=None,
        issuer: str = "https://kaiju.local/realms/development",
        audience: str = "kaiju",
        expires_at: datetime | None = None,
        username: str = "Vic Fernandez III",
        given_name: str = "Vic",
        family_name: str = "Fernandez III",
        email: str = "victor@deathlabs.io",
    ) -> str:
        now = datetime.now(UTC)
        return encode(
            {
                "iss": issuer,
                "aud": audience,
                "sub": "00000000-0000-0000-0000-000000000001",
                "iat": now,
                "exp": expires_at or now + timedelta(minutes=10),
                "preferred_username": username,
                "given_name": given_name,
                "family_name": family_name,
                "email": email,
            },
            private_key or self.private_key,
            algorithm="RS256",
            headers={"kid": "kaiju-test"},
        )

    def _authorization(self, token: str) -> dict[str, str]:
        return {"HTTP_AUTHORIZATION": f"Bearer {token}"}

    def _settings(self):
        return override_settings(
            AUTH_MODE="local",
            OIDC_ISSUER="https://kaiju.local/realms/development",
            OIDC_AUDIENCE="kaiju",
            OIDC_PUBLIC_KEY_PATH=str(self.public_key_path),
        )

    def _create_exercise(
        self,
        objective_ids: list[str] | None = None,
        reference_ids: list[str] | None = None,
    ) -> HttpResponse:
        payload = {
            "title": "Incident response exercise",
            "type": "discussion",
            "scheduled_start_time": "2026-11-16T13:00:00Z",
            "scheduled_end_time": "2026-11-16T15:00:00Z",
            "scenario": "Unknown outbound traffic was observed.",
        }
        if objective_ids is not None:
            payload["objective_ids"] = objective_ids
        if reference_ids is not None:
            payload["reference_ids"] = reference_ids

        with self._settings():
            return self.client.post(
                "/api/v1/exercises/",
                data=json.dumps(payload),
                content_type="application/json",
                **self._authorization(self._token()),
            )

    def test_current_user_returns_validated_local_user(self):
        with self._settings():
            response = self.client.get(
                "/api/v1/me",
                **self._authorization(self._token()),
            )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["display_name"], "Vic Fernandez III")
        self.assertEqual(response.json()["username"], "Vic Fernandez III")
        self.assertEqual(response.json()["email"], "victor@deathlabs.io")

    def test_users_returns_selectable_users(self):
        get_user_model().objects.create_user(
            username="mothra",
            first_name="Mosura",
            email="mosura@deathlabs.io",
        )

        with self._settings():
            response = self.client.get(
                "/api/v1/users",
                **self._authorization(self._token()),
            )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(
            response.json(),
            [
                {
                    "username": "mothra",
                    "display_name": "Mosura",
                    "first_name": "Mosura",
                    "last_name": "",
                },
                {
                    "username": "Vic Fernandez III",
                    "display_name": "Vic Fernandez III",
                    "first_name": "Vic",
                    "last_name": "Fernandez III",
                },
            ],
        )

    def test_exercise_creation_uses_selected_facilitator(self):
        facilitator = get_user_model().objects.create_user(
            username="mothra",
            first_name="Mosura",
            email="mosura@deathlabs.io",
        )
        payload = {
            "title": "Incident response exercise",
            "type": "discussion",
            "scheduled_start_time": "2026-11-16T13:00:00Z",
            "scheduled_end_time": "2026-11-16T15:00:00Z",
            "scenario": "Unknown outbound traffic was observed.",
            "facilitator_username": facilitator.username,
        }

        with self._settings():
            response = self.client.post(
                "/api/v1/exercises/",
                data=json.dumps(payload),
                content_type="application/json",
                **self._authorization(self._token()),
            )

        self.assertEqual(response.status_code, 201)
        participant = response.json()["participants"][0]
        self.assertEqual(participant["first_name"], "Mosura")
        self.assertEqual(participant["email"], "mosura@deathlabs.io")
        self.assertEqual(participant["role"], "facilitator")

    def test_exercise_creation_rejects_unknown_facilitator(self):
        payload = {
            "title": "Incident response exercise",
            "type": "discussion",
            "scheduled_start_time": "2026-11-16T13:00:00Z",
            "scheduled_end_time": "2026-11-16T15:00:00Z",
            "scenario": "Unknown outbound traffic was observed.",
            "facilitator_username": "missing-user",
        }

        with self._settings():
            response = self.client.post(
                "/api/v1/exercises/",
                data=json.dumps(payload),
                content_type="application/json",
                **self._authorization(self._token()),
            )

        self.assertEqual(response.status_code, 400)
        self.assertEqual(
            response.json(),
            {"message": "The selected facilitator does not exist"},
        )

    def test_metrics_returns_application_record_counts(self):
        user_model = get_user_model()
        user_model.objects.create_user(username="Existing user")
        objective = Objective.objects.create(
            title="Validate escalation",
            description="Validate the escalation process.",
        )
        Reference.objects.create(
            type=Reference.Type.GUIDELINE,
            title="Response plan",
            url="https://example.com/response-plan",
        )
        self._create_exercise([str(objective.id)])

        with self._settings():
            response = self.client.get(
                "/api/v1/metrics",
                **self._authorization(self._token()),
            )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(
            response.json(),
            {
                "exercises": 1,
                "objectives": 1,
                "references": 1,
                "users": 2,
            },
        )

    def test_reference_creation_requires_a_supported_type(self):
        payload = {
            "type": "standard",
            "title": "Access control standard",
            "url": "https://example.com/access-control-standard",
        }

        with self._settings():
            response = self.client.post(
                "/api/v1/references/",
                data=json.dumps(payload),
                content_type="application/json",
                **self._authorization(self._token()),
            )
            invalid_response = self.client.post(
                "/api/v1/references/",
                data=json.dumps({**payload, "type": "memo"}),
                content_type="application/json",
                **self._authorization(self._token()),
            )

        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.json()["type"], "standard")
        self.assertEqual(Reference.objects.get().type, Reference.Type.STANDARD)
        self.assertEqual(invalid_response.status_code, 422)

    def test_missing_token_is_rejected(self):
        with self._settings():
            response = self.client.get("/api/v1/me")

        self.assertEqual(response.status_code, 401)

    def test_expired_token_is_rejected(self):
        token = self._token(expires_at=datetime.now(UTC) - timedelta(seconds=1))

        with self._settings():
            response = self.client.get(
                "/api/v1/me",
                **self._authorization(token),
            )

        self.assertEqual(response.status_code, 401)

    def test_wrong_audience_is_rejected(self):
        with self._settings():
            response = self.client.get(
                "/api/v1/me",
                **self._authorization(self._token(audience="another-application")),
            )

        self.assertEqual(response.status_code, 401)

    def test_wrong_issuer_is_rejected(self):
        with self._settings():
            response = self.client.get(
                "/api/v1/me",
                **self._authorization(self._token(issuer="https://example.mil")),
            )

        self.assertEqual(response.status_code, 401)

    def test_invalid_signature_is_rejected(self):
        other_private_key = rsa.generate_private_key(
            public_exponent=65537, key_size=2048
        )

        with self._settings():
            response = self.client.get(
                "/api/v1/me",
                **self._authorization(self._token(private_key=other_private_key)),
            )

        self.assertEqual(response.status_code, 401)

    def test_validated_user_can_create_exercise(self):
        with self._settings():
            response = self.client.post(
                "/api/v1/exercises/",
                data=json.dumps(
                    {
                        "title": "Incident response exercise",
                        "type": "discussion",
                        "scheduled_start_time": "2026-11-16T13:00:00Z",
                        "scheduled_end_time": "2026-11-16T15:00:00Z",
                        "scenario": "Unknown outbound traffic was observed.",
                    }
                ),
                content_type="application/json",
                **self._authorization(self._token()),
            )

        self.assertEqual(response.status_code, 201)
        user = get_user_model().objects.get(username="Vic Fernandez III")
        self.assertEqual(user.exercises_created.count(), 1)
        self.assertEqual(user.exercises_updated.count(), 1)
        self.assertEqual(response.json()["created_by"]["username"], user.username)
        self.assertEqual(response.json()["updated_by"]["username"], user.username)

    def test_exercise_update_records_authenticated_user(self):
        with self._settings():
            create_response = self.client.post(
                "/api/v1/exercises/",
                data=json.dumps(
                    {
                        "title": "Incident response exercise",
                        "type": "discussion",
                        "scheduled_start_time": "2026-11-16T13:00:00Z",
                        "scheduled_end_time": "2026-11-16T15:00:00Z",
                        "scenario": "Unknown outbound traffic was observed.",
                    }
                ),
                content_type="application/json",
                **self._authorization(self._token()),
            )
            exercise_id = create_response.json()["id"]
            update_response = self.client.patch(
                f"/api/v1/exercises/{exercise_id}/",
                data=json.dumps({"title": "Updated exercise"}),
                content_type="application/json",
                **self._authorization(
                    self._token(
                        username="Grace Hopper",
                        given_name="Grace",
                        family_name="Hopper",
                        email="grace@example.com",
                    )
                ),
            )

        self.assertEqual(update_response.status_code, 200)
        self.assertEqual(
            update_response.json()["created_by"]["username"],
            "Vic Fernandez III",
        )
        self.assertEqual(
            update_response.json()["updated_by"]["username"],
            "Grace Hopper",
        )

    def test_exercise_update_changes_facilitator(self):
        create_response = self._create_exercise()
        exercise_id = create_response.json()["id"]
        get_user_model().objects.create_user(
            username="Grace Hopper",
            first_name="Grace",
            last_name="Hopper",
            email="grace@example.com",
        )

        with self._settings():
            response = self.client.patch(
                f"/api/v1/exercises/{exercise_id}/",
                data=json.dumps({"facilitator_username": "Grace Hopper"}),
                content_type="application/json",
                **self._authorization(self._token()),
            )

        self.assertEqual(response.status_code, 200)
        facilitator = Exercise.objects.get(id=exercise_id).facilitator
        self.assertEqual(facilitator.first_name, "Grace")
        self.assertEqual(facilitator.last_name, "Hopper")
        self.assertEqual(facilitator.email, "grace@example.com")

    def test_facilitator_assignments_and_primary_protection(self):
        exercise_id = self._create_exercise().json()["id"]
        exercise = Exercise.objects.get(id=exercise_id)
        original_id = str(exercise.facilitator_id)
        assistant = Participant.objects.create(
            exercise=exercise, first_name="Grace", last_name="Hopper",
            role=Participant.Role.FACILITATOR,
        )
        with self._settings():
            response = self.client.patch(
                f"/api/v1/exercises/{exercise_id}/",
                data=json.dumps({"facilitator_id": str(assistant.id),
                                 "assistant_facilitator_ids": [original_id]}),
                content_type="application/json",
                **self._authorization(self._token()),
            )
            self.assertEqual(response.status_code, 200)
            self.assertEqual(response.json()["facilitator_id"], str(assistant.id))
            self.assertEqual(response.json()["assistant_facilitator_ids"], [original_id])
            rejected = self.client.delete(
                f"/api/v1/exercises/{exercise_id}/participants/{assistant.id}/",
                **self._authorization(self._token()),
            )
            self.assertEqual(rejected.status_code, 400)
            invalid = self.client.patch(
                f"/api/v1/exercises/{exercise_id}/",
                data=json.dumps({"assistant_facilitator_ids": [str(assistant.id)]}),
                content_type="application/json",
                **self._authorization(self._token()),
            )
            self.assertEqual(invalid.status_code, 400)
            exercise.refresh_from_db()
            self.assertEqual(exercise.facilitator_id, assistant.id)

    def test_exercise_creation_attaches_objectives(self):
        objective = Objective.objects.create(
            title="Validate escalation",
            description="Validate the escalation process.",
        )

        response = self._create_exercise([str(objective.id)])

        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.json()["objectives"][0]["id"], str(objective.id))
        self.assertEqual(Exercise.objects.get().objectives.get(), objective)

    def test_exercise_list_includes_objectives_and_references(self):
        objective = Objective.objects.create(
            title="Validate escalation",
            description="Validate the escalation process.",
        )
        reference = Reference.objects.create(
            type=Reference.Type.GUIDELINE,
            title="Incident response plan",
            url="https://example.com/incident-response-plan",
        )
        self._create_exercise(
            objective_ids=[str(objective.id)],
            reference_ids=[str(reference.id)],
        )

        with self._settings():
            response = self.client.get(
                "/api/v1/exercises/",
                **self._authorization(self._token()),
            )
            references_response = self.client.get(
                "/api/v1/references/",
                **self._authorization(self._token()),
            )
            objectives_response = self.client.get(
                "/api/v1/objectives/",
                **self._authorization(self._token()),
            )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(
            response.json()[0]["scenario"],
            "Unknown outbound traffic was observed.",
        )
        self.assertEqual(response.json()[0]["objectives"][0]["id"], str(objective.id))
        self.assertEqual(response.json()[0]["references"][0]["id"], str(reference.id))
        self.assertEqual(references_response.status_code, 200)
        self.assertEqual(references_response.json()[0]["exercise_count"], 1)
        self.assertEqual(
            references_response.json()[0]["exercises"][0]["title"],
            "Incident response exercise",
        )
        self.assertEqual(objectives_response.status_code, 200)
        self.assertEqual(objectives_response.json()[0]["exercise_count"], 1)
        self.assertEqual(
            objectives_response.json()[0]["exercises"][0]["title"],
            "Incident response exercise",
        )

    def test_exercise_creation_creates_and_attaches_objectives(self):
        existing_objective = Objective.objects.create(
            title="Validate detection",
            description="Validate the detection process.",
        )
        payload = {
            "title": "Incident response exercise",
            "type": "discussion",
            "scheduled_start_time": "2026-11-16T13:00:00Z",
            "scheduled_end_time": "2026-11-16T15:00:00Z",
            "scenario": "Unknown outbound traffic was observed.",
            "objective_ids": [str(existing_objective.id)],
            "new_objectives": [
                {
                    "title": "Validate escalation",
                    "description": "Validate the escalation process.",
                }
            ],
        }

        with self._settings():
            response = self.client.post(
                "/api/v1/exercises/",
                data=json.dumps(payload),
                content_type="application/json",
                **self._authorization(self._token()),
            )

        self.assertEqual(response.status_code, 201)
        self.assertEqual(Objective.objects.count(), 2)
        self.assertEqual(Exercise.objects.get().objectives.count(), 2)
        self.assertEqual(len(response.json()["objectives"]), 2)

    def test_exercise_creation_rejects_unknown_objectives(self):
        response = self._create_exercise([str(uuid4())])

        self.assertEqual(response.status_code, 400)
        self.assertEqual(Exercise.objects.count(), 0)

    def test_exercise_creation_attaches_references(self):
        reference = Reference.objects.create(
            type=Reference.Type.GUIDELINE,
            title="Incident response plan",
            url="https://example.com/incident-response-plan",
        )

        response = self._create_exercise(reference_ids=[str(reference.id)])

        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.json()["references"][0]["id"], str(reference.id))
        self.assertEqual(Exercise.objects.get().references.get(), reference)

    def test_exercise_creation_creates_and_attaches_references(self):
        payload = {
            "title": "Incident response exercise",
            "type": "discussion",
            "scheduled_start_time": "2026-11-16T13:00:00Z",
            "scheduled_end_time": "2026-11-16T15:00:00Z",
            "scenario": "Unknown outbound traffic was observed.",
            "new_references": [
                {
                    "type": "guideline",
                    "title": "Incident response plan",
                    "url": "https://example.com/incident-response-plan",
                }
            ],
        }

        with self._settings():
            response = self.client.post(
                "/api/v1/exercises/",
                data=json.dumps(payload),
                content_type="application/json",
                **self._authorization(self._token()),
            )

        self.assertEqual(response.status_code, 201)
        reference = Reference.objects.get()
        self.assertEqual(response.json()["references"][0]["id"], str(reference.id))
        self.assertEqual(Exercise.objects.get().references.get(), reference)

    def test_exercise_creation_rejects_unknown_references(self):
        response = self._create_exercise(reference_ids=[str(uuid4())])

        self.assertEqual(response.status_code, 400)
        self.assertEqual(Exercise.objects.count(), 0)

    def test_exercise_update_validates_all_objectives_before_changes(self):
        create_response = self._create_exercise()
        exercise_id = create_response.json()["id"]

        with self._settings():
            response = self.client.patch(
                f"/api/v1/exercises/{exercise_id}/",
                data=json.dumps(
                    {
                        "title": "Invalid update",
                        "objective_ids": [str(uuid4())],
                    }
                ),
                content_type="application/json",
                **self._authorization(self._token()),
            )

        self.assertEqual(response.status_code, 400)
        exercise = Exercise.objects.get(id=exercise_id)
        self.assertEqual(exercise.title, "Incident response exercise")
        self.assertEqual(exercise.objectives.count(), 0)

    def test_exercise_update_attaches_objectives(self):
        objective = Objective.objects.create(
            title="Validate escalation",
            description="Validate the escalation process.",
        )
        create_response = self._create_exercise()
        exercise_id = create_response.json()["id"]

        with self._settings():
            response = self.client.patch(
                f"/api/v1/exercises/{exercise_id}/",
                data=json.dumps({"objective_ids": [str(objective.id)]}),
                content_type="application/json",
                **self._authorization(self._token()),
            )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["objectives"][0]["id"], str(objective.id))

    def test_exercise_update_creates_and_attaches_objectives(self):
        create_response = self._create_exercise()
        exercise_id = create_response.json()["id"]

        with self._settings():
            response = self.client.patch(
                f"/api/v1/exercises/{exercise_id}/",
                data=json.dumps(
                    {
                        "new_objectives": [
                            {
                                "title": "Validate escalation",
                                "description": "Validate the escalation process.",
                            }
                        ]
                    }
                ),
                content_type="application/json",
                **self._authorization(self._token()),
            )

        self.assertEqual(response.status_code, 200)
        objective = Objective.objects.get()
        self.assertEqual(response.json()["objectives"][0]["id"], str(objective.id))
        self.assertEqual(
            Exercise.objects.get(id=exercise_id).objectives.get(),
            objective,
        )

    def test_exercise_update_creates_and_attaches_references(self):
        create_response = self._create_exercise()
        exercise_id = create_response.json()["id"]

        with self._settings():
            response = self.client.patch(
                f"/api/v1/exercises/{exercise_id}/",
                data=json.dumps(
                    {
                        "new_references": [
                            {
                                "type": "guideline",
                                "title": "Incident response plan",
                                "url": "https://example.com/incident-response-plan",
                            }
                        ]
                    }
                ),
                content_type="application/json",
                **self._authorization(self._token()),
            )

        self.assertEqual(response.status_code, 200)
        reference = Reference.objects.get()
        self.assertEqual(response.json()["references"][0]["id"], str(reference.id))
        self.assertEqual(
            Exercise.objects.get(id=exercise_id).references.get(),
            reference,
        )

    def test_exercise_update_rejects_unknown_references_before_changes(self):
        create_response = self._create_exercise()
        exercise_id = create_response.json()["id"]

        with self._settings():
            response = self.client.patch(
                f"/api/v1/exercises/{exercise_id}/",
                data=json.dumps(
                    {
                        "title": "Invalid update",
                        "reference_ids": [str(uuid4())],
                    }
                ),
                content_type="application/json",
                **self._authorization(self._token()),
            )

        self.assertEqual(response.status_code, 400)
        exercise = Exercise.objects.get(id=exercise_id)
        self.assertEqual(exercise.title, "Incident response exercise")
        self.assertEqual(exercise.references.count(), 0)

    def test_exercise_list_includes_facilitator_and_participants(self):
        exercise_id = self._create_exercise().json()["id"]
        Participant.objects.create(
            exercise_id=exercise_id,
            first_name="Mothra",
            last_name="Mosura",
            role=Participant.Role.USER,
        )
        with self._settings():
            response = self.client.get(
                "/api/v1/exercises/", **self._authorization(self._token())
            )

        self.assertEqual(response.status_code, 200)
        participants = response.json()[0]["participants"]
        self.assertCountEqual(
            [(person["first_name"], person["last_name"], person["role"]) for person in participants],
            [("Vic", "Fernandez III", "facilitator"), ("Mothra", "Mosura", "user")],
        )

    def test_event_saves_new_injects_and_rejects_duplicate_numbers(self):
        exercise_id = self._create_exercise().json()["id"]
        inject = {
            "number": "1A",
            "scheduled_start_time": "2026-11-16T13:00:00Z",
            "delivery_method": "email",
            "sender": "cybersecurity_service_provider",
            "recipient": "user",
            "message": "Investigate the alert.",
        }
        with self._settings():
            authorization = self._authorization(self._token())
            response = self.client.post(
                f"/api/v1/exercises/{exercise_id}/events/",
                data=json.dumps({"number": 1, "description": "Initial event", "objective_ids": [], "new_injects": [inject]}),
                content_type="application/json", **authorization,
            )
            self.assertEqual(response.status_code, 201)
            event_id = response.json()["id"]
            self.assertEqual(response.json()["injects"][0]["number"], "1A")
            url = f"/api/v1/exercises/{exercise_id}/events/{event_id}/"
            response = self.client.patch(
                url, data=json.dumps({"description": "Updated", "new_injects": [inject]}),
                content_type="application/json", **authorization,
            )
            self.assertEqual(response.status_code, 400)
            self.assertEqual(Event.objects.get(id=event_id).description, "Initial event")
            self.assertEqual(Inject.objects.filter(event_id=event_id).count(), 1)
            inject["number"] = "1B"
            response = self.client.patch(
                url, data=json.dumps({"description": "Updated", "new_injects": [inject]}),
                content_type="application/json", **authorization,
            )
            self.assertEqual(response.status_code, 200)
            self.assertEqual(Inject.objects.filter(event_id=event_id).count(), 2)

    def test_event_order_is_saved_and_invalid_orders_are_rejected(self):
        with self._settings():
            authorization = self._authorization(self._token())
            exercise_id = self._create_exercise().json()["id"]
            events = [
                Event.objects.create(exercise_id=exercise_id, number=number, description=str(number))
                for number in (1, 2, 3)
            ]
            url = f"/api/v1/exercises/{exercise_id}/events/order/"
            event_ids = [str(event.id) for event in reversed(events)]
            response = self.client.put(
                url, data=json.dumps({"event_ids": event_ids}),
                content_type="application/json", **authorization,
            )
            self.assertEqual(response.status_code, 204)
            response = self.client.get(f"/api/v1/exercises/{exercise_id}/", **authorization)
            self.assertEqual([event["id"] for event in response.json()["events"]], event_ids)
            response = self.client.put(
                url, data=json.dumps({"event_ids": [event_ids[0]] * 3}),
                content_type="application/json", **authorization,
            )
            self.assertEqual(response.status_code, 400)
            self.assertEqual(list(Event.objects.values_list("id", flat=True)), [event.id for event in reversed(events)])

    def test_event_creation_rejects_objectives_outside_exercise(self):
        exercise_objective = Objective.objects.create(
            title="Validate escalation",
            description="Validate the escalation process.",
        )
        other_objective = Objective.objects.create(
            title="Validate recovery",
            description="Validate the recovery process.",
        )
        create_response = self._create_exercise([str(exercise_objective.id)])
        exercise_id = create_response.json()["id"]

        with self._settings():
            response = self.client.post(
                f"/api/v1/exercises/{exercise_id}/events/",
                data=json.dumps(
                    {
                        "number": 1,
                        "description": "Investigate the alert.",
                        "objective_ids": [str(other_objective.id)],
                    }
                ),
                content_type="application/json",
                **self._authorization(self._token()),
            )

        self.assertEqual(response.status_code, 400)
        self.assertEqual(Event.objects.count(), 0)

    def test_event_creation_creates_and_attaches_new_objectives(self):
        create_response = self._create_exercise()
        exercise_id = create_response.json()["id"]

        with self._settings():
            response = self.client.post(
                f"/api/v1/exercises/{exercise_id}/events/",
                data=json.dumps(
                    {
                        "number": 1,
                        "description": "Investigate the alert.",
                        "new_objectives": [
                            {
                                "title": "Validate escalation",
                                "description": "Validate the escalation process.",
                            }
                        ],
                        "objective_ids": [],
                    }
                ),
                content_type="application/json",
                **self._authorization(self._token()),
            )

        self.assertEqual(response.status_code, 201)
        objective = Objective.objects.get(title="Validate escalation")
        self.assertEqual(Event.objects.get().objectives.get(), objective)
        self.assertEqual(
            Exercise.objects.get(id=exercise_id).objectives.get(), objective
        )

    def test_event_update_rejects_objectives_outside_exercise(self):
        exercise_objective = Objective.objects.create(
            title="Validate escalation",
            description="Validate the escalation process.",
        )
        other_objective = Objective.objects.create(
            title="Validate recovery",
            description="Validate the recovery process.",
        )
        create_response = self._create_exercise([str(exercise_objective.id)])
        exercise_id = create_response.json()["id"]

        with self._settings():
            event_response = self.client.post(
                f"/api/v1/exercises/{exercise_id}/events/",
                data=json.dumps(
                    {
                        "number": 1,
                        "description": "Investigate the alert.",
                        "objective_ids": [str(exercise_objective.id)],
                    }
                ),
                content_type="application/json",
                **self._authorization(self._token()),
            )
            event_id = event_response.json()["id"]
            response = self.client.patch(
                f"/api/v1/exercises/{exercise_id}/events/{event_id}/",
                data=json.dumps(
                    {
                        "description": "Invalid update.",
                        "objective_ids": [str(other_objective.id)],
                    }
                ),
                content_type="application/json",
                **self._authorization(self._token()),
            )

        self.assertEqual(response.status_code, 400)
        event = Event.objects.get(id=event_id)
        self.assertEqual(event.description, "Investigate the alert.")
        self.assertEqual(event.objectives.get(), exercise_objective)

    def test_exercise_card_send_and_reply(self):
        exercise_id = self._create_exercise().json()["id"]
        event = Event.objects.create(exercise_id=exercise_id, number=1, description="Investigate.")
        inject = Inject.objects.create(
            event=event, recipient=Inject.Role.ISSO, number="1A",
            scheduled_start_time="2026-11-16T13:05:00Z",
            delivery_method=Inject.DeliveryMethod.EMAIL, sender=Inject.Role.CSSP,
            message="Investigate the traffic.",
        )
        participant = Participant.objects.create(
            exercise_id=exercise_id, first_name="Ada", last_name="Player",
            email="ada@example.com", role=Participant.Role.ISSO,
        )
        base = f"/api/v1/exercises/{exercise_id}/events/{event.id}/injects/{inject.id}/"
        player = self._authorization(self._token(username="ada", email=participant.email))
        facilitator = self._authorization(self._token())
        with self._settings():
            before = self.client.post(base + "cards/", data=json.dumps({"type": "question", "text": "What happened?"}), content_type="application/json", **player)
            forbidden = self.client.post(base + "send/", data="{}", content_type="application/json", **player)
            sent = self.client.post(base + "send/", data="{}", content_type="application/json", **facilitator)
            repeat = self.client.post(base + "send/", data="{}", content_type="application/json", **facilitator)
            reply = self.client.post(base + "cards/", data=json.dumps({"type": "question", "text": " What happened? "}), content_type="application/json", **player)
            invalid = self.client.post(base + "cards/", data=json.dumps({"type": "question", "text": "   "}), content_type="application/json", **player)
        self.assertEqual(before.status_code, 404)
        self.assertEqual(forbidden.status_code, 403)
        self.assertEqual(sent.status_code, 200)
        self.assertEqual(sent.json()["started_at"], repeat.json()["started_at"])
        self.assertEqual(reply.status_code, 201)
        self.assertEqual(reply.json()["type"], "question")
        self.assertEqual(reply.json()["text"], "What happened?")
        self.assertEqual(reply.json()["participant"]["id"], str(participant.id))
        self.assertEqual(invalid.status_code, 400)

    def test_unlisted_user_can_reply_without_email(self):
        exercise_id = self._create_exercise().json()["id"]
        event = Event.objects.create(exercise_id=exercise_id, number=1, description="Investigate.")
        inject = Inject.objects.create(
            event=event, recipient=Inject.Role.ISSO, number="1A",
            scheduled_start_time="2026-11-16T13:05:00Z",
            started_at=datetime.now(UTC), delivery_method=Inject.DeliveryMethod.EMAIL,
            sender=Inject.Role.CSSP, message="Investigate the traffic.",
        )
        url = f"/api/v1/exercises/{exercise_id}/events/{event.id}/injects/{inject.id}/cards/"
        authorization = self._authorization(self._token(username="new-user", email=""))
        with self._settings():
            first = self.client.post(url, data=json.dumps({"type": "question", "text": "What happened?"}), content_type="application/json", **authorization)
            second = self.client.post(url, data=json.dumps({"type": "response", "text": "Investigating."}), content_type="application/json", **authorization)
        self.assertEqual(first.status_code, 201)
        self.assertEqual(second.status_code, 201)
        self.assertEqual(first.json()["participant"]["id"], second.json()["participant"]["id"])
        participant = Participant.objects.get(id=first.json()["participant"]["id"])
        self.assertEqual(participant.role, Participant.Role.USER)
        self.assertEqual(participant.user.username, "new-user")
        self.assertIsNone(participant.email)

    def test_inject_update_uses_role_endpoints(self):
        exercise_id = self._create_exercise().json()["id"]
        event = Event.objects.create(
            exercise_id=exercise_id,
            number=1,
            description="Investigate the alert.",
        )
        inject = Inject.objects.create(
            event=event,
            recipient=Inject.Role.ISSO,
            number="1A",
            scheduled_start_time="2026-11-16T13:05:00Z",
            delivery_method=Inject.DeliveryMethod.EMAIL,
            sender=Inject.Role.CSSP,
            message="Investigate the traffic.",
        )

        with self._settings():
            response = self.client.patch(
                (
                    f"/api/v1/exercises/{exercise_id}/events/{event.id}/"
                    f"injects/{inject.id}/"
                ),
                data=json.dumps(
                    {
                        "sender": Inject.Role.ISSO,
                        "recipient": Inject.Role.ISSM,
                    }
                ),
                content_type="application/json",
                **self._authorization(self._token()),
            )

        self.assertEqual(response.status_code, 200)
        inject.refresh_from_db()
        self.assertEqual(inject.sender, Inject.Role.ISSO)
        self.assertEqual(inject.recipient, Inject.Role.ISSM)

    def test_inject_rejects_facilitator_endpoint(self):
        exercise_id = self._create_exercise().json()["id"]
        event = Event.objects.create(
            exercise_id=exercise_id,
            number=1,
            description="Investigate the alert.",
        )

        with self._settings():
            response = self.client.post(
                f"/api/v1/exercises/{exercise_id}/events/{event.id}/injects/",
                data=json.dumps(
                    {
                        "number": "1A",
                        "scheduled_start_time": "2026-11-16T13:05:00Z",
                        "delivery_method": Inject.DeliveryMethod.EMAIL,
                        "sender": Participant.Role.FACILITATOR,
                        "recipient": Inject.Role.ISSO,
                        "message": "Investigate the traffic.",
                    }
                ),
                content_type="application/json",
                **self._authorization(self._token()),
            )

        self.assertEqual(response.status_code, 422)

    def test_exercise_delete_removes_injects_and_participants(self):
        exercise_id = self._create_exercise().json()["id"]
        event = Event.objects.create(
            exercise_id=exercise_id,
            number=1,
            description="Investigate the alert.",
        )
        Inject.objects.create(
            event=event,
            recipient=Inject.Role.ISSO,
            number="1A",
            scheduled_start_time="2026-11-16T13:05:00Z",
            delivery_method=Inject.DeliveryMethod.EMAIL,
            sender=Inject.Role.CSSP,
            message="Investigate the traffic.",
        )

        with self._settings():
            response = self.client.delete(
                f"/api/v1/exercises/{exercise_id}/",
                **self._authorization(self._token()),
            )

        self.assertEqual(response.status_code, 204)
        self.assertFalse(Exercise.objects.filter(id=exercise_id).exists())
        self.assertEqual(Participant.objects.count(), 0)
        self.assertEqual(Inject.objects.count(), 0)

    def test_exercise_update_keeps_objectives_used_by_events(self):
        objective = Objective.objects.create(
            title="Validate escalation",
            description="Validate the escalation process.",
        )
        create_response = self._create_exercise([str(objective.id)])
        exercise_id = create_response.json()["id"]

        with self._settings():
            self.client.post(
                f"/api/v1/exercises/{exercise_id}/events/",
                data=json.dumps(
                    {
                        "number": 1,
                        "description": "Investigate the alert.",
                        "objective_ids": [str(objective.id)],
                    }
                ),
                content_type="application/json",
                **self._authorization(self._token()),
            )
            response = self.client.patch(
                f"/api/v1/exercises/{exercise_id}/",
                data=json.dumps({"objective_ids": []}),
                content_type="application/json",
                **self._authorization(self._token()),
            )

        self.assertEqual(response.status_code, 400)
        self.assertEqual(
            Exercise.objects.get(id=exercise_id).objectives.get(), objective
        )

    def test_health_endpoint_does_not_require_token(self):
        response = self.client.get("/api/v1/health/")

        self.assertEqual(response.status_code, 200)
