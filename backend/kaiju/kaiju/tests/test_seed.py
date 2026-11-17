"""Tests for local development data seeding."""

# Standard library imports.
from datetime import UTC, datetime
from io import StringIO
from pathlib import Path
from shlex import split
from subprocess import run
from sys import executable
from tempfile import TemporaryDirectory
from uuid import UUID

# Third party imports.
from django.contrib.auth import get_user_model
from django.core.management import call_command
from django.test import TestCase, override_settings

# Local imports.
from exercises.management.commands.seed import DEVELOPMENT_EXERCISE_ID
from exercises.models import Event, Exercise, Inject, Participant, Response
from exercises.role_limits import ROLE_LIMITS
from objectives.models import Objective
from references.models import Reference
from seed_data import PARTICIPANTS, seed_participants


class SeedDevelopmentDataTests(TestCase):
    def test_local_tokens_authenticate_seeded_roles(self):
        call_command("seed", stdout=StringIO())
        script = Path(__file__).resolve().parents[4] / "scripts" / "auth.py"
        roles = {
            "FACILITATOR": Participant.Role.FACILITATOR,
            "ISO": Participant.Role.ISO,
            "ISSM": Participant.Role.ISSM,
            "ISSO": Participant.Role.ISSO,
            "SYSTEM_ADMINISTRATOR": Participant.Role.SYSTEM_ADMINISTRATOR,
            "USER": Participant.Role.USER,
            "CSSP": Participant.Role.CSSP,
            "OPFOR": Participant.Role.OPFOR,
        }
        with TemporaryDirectory() as directory:
            run(
                [executable, str(script), "--issuer", "https://kaiju.local", "--audience", "kaiju", "--multiple"],
                cwd=directory,
                check=True,
                capture_output=True,
                text=True,
            )
            values = {}
            for line in (Path(directory) / ".env").read_text().splitlines():
                name, value = split(line)[1].split("=", 1)
                values[name] = value
            with override_settings(
                AUTH_MODE="local",
                OIDC_ISSUER="https://kaiju.local",
                OIDC_AUDIENCE="kaiju",
                OIDC_PUBLIC_KEY_PATH=values["OIDC_PUBLIC_KEY_PATH"],
            ):
                emails = set()
                for name, role in roles.items():
                    response = self.client.get(
                        "/api/v1/me",
                        HTTP_AUTHORIZATION=f"Bearer {values[f'AUTH_TOKEN_{name}']}",
                    )
                    self.assertEqual(response.status_code, 200)
                    if role == Participant.Role.FACILITATOR:
                        self.assertEqual(response.json()["username"], "Justin Hartung")
                    email = response.json()["email"]
                    emails.add(email)
                    participant = Participant.objects.get(
                        exercise_id=DEVELOPMENT_EXERCISE_ID, email=email,
                    )
                    self.assertEqual(participant.role, role)
                self.assertEqual(len(emails), len(roles))

    def test_seed_is_idempotent(self):
        first_output = StringIO()
        second_output = StringIO()

        call_command("seed", stdout=first_output)
        call_command("seed", stdout=second_output)

        self.assertEqual(get_user_model().objects.count(), 20)
        self.assertTrue(
            get_user_model().objects.filter(username="Justin Hartung").exists(),
        )
        self.assertEqual(Exercise.objects.count(), 7)
        self.assertEqual(Participant.objects.count(), 140)
        self.assertEqual(Reference.objects.count(), 1)
        self.assertEqual(Objective.objects.count(), 4)
        self.assertEqual(Event.objects.count(), 21)
        self.assertEqual(Inject.objects.count(), 24)
        exercise = Exercise.objects.get(id=DEVELOPMENT_EXERCISE_ID)
        self.assertEqual(exercise.title, "Perimeter Breach")
        self.assertEqual(exercise.facilitator.email, "justin.hartung@deathlabs.io")
        participant = exercise.participants.get(email="victor@deathlabs.io")
        self.assertEqual(participant.role, Participant.Role.ISSM)
        self.assertEqual((participant.first_name, participant.last_name), ("Vic", "Fernandez III"))
        self.assertEqual(exercise.references.get().title, "NIST SP 800-61 Rev. 3")
        self.assertEqual(exercise.objectives.count(), 4)
        self.assertEqual(
            list(exercise.events.values_list("description", flat=True)),
            ["Detect", "Respond", "Recover"],
        )
        self.assertEqual(exercise.events.get(number=1).objectives.count(), 3)
        self.assertSetEqual(
            set(Exercise.objects.values_list("title", flat=True)),
            {
                "Perimeter Breach",
                "King of the Payload",
                "Scorched Earth",
                "Multi-Vector Strike",
                "Atomic Exfiltration",
                "Rogue Gallery",
                "Mutual Assured Disruption",
            },
        )
        self.assertEqual(
            dict(Exercise.objects.values_list("title", "id")),
            {
                "Perimeter Breach": UUID(int=1),
                "King of the Payload": UUID(int=2),
                "Scorched Earth": UUID(int=3),
                "Multi-Vector Strike": UUID(int=4),
                "Atomic Exfiltration": UUID(int=5),
                "Rogue Gallery": UUID(int=6),
                "Mutual Assured Disruption": UUID(int=7),
            },
        )
        for exercise in Exercise.objects.all():
            self.assertEqual(exercise.participants.count(), 20)
            for role, limit in ROLE_LIMITS.items():
                self.assertLessEqual(exercise.participants.filter(role=role).count(), limit)
            self.assertEqual(exercise.participants.get(role=Participant.Role.ISSM).email, "victor@deathlabs.io")
            self.assertEqual(exercise.events.count(), 3)
            self.assertEqual(exercise.references.get().title, "NIST SP 800-61 Rev. 3")
            for event in exercise.events.all():
                self.assertTrue(event.objectives.exists())
                self.assertTrue(event.injects.exists())
                for inject in event.injects.all():
                    self.assertLessEqual(
                        exercise.scheduled_start_time, inject.scheduled_start_time
                    )
                    self.assertLessEqual(
                        inject.scheduled_start_time, exercise.scheduled_end_time
                    )
                    self.assertTrue(inject.expected_response)
        self.assertTrue(
            Exercise.objects.filter(id=DEVELOPMENT_EXERCISE_ID).exists(),
        )
        for first_name, last_name, _ in PARTICIPANTS:
            email = "victor@deathlabs.io" if (first_name, last_name) == ("Vic", "Fernandez III") else f"{first_name}.{last_name}@deathlabs.io".lower()
            self.assertTrue(
                get_user_model()
                .objects.filter(
                    username=f"{first_name} {last_name}",
                    first_name=first_name,
                    last_name=last_name,
                    email=email,
                )
                .exists(),
            )

    def test_seed_reconciles_old_roster_without_removing_other_participants(self):
        call_command("seed", stdout=StringIO())
        exercise = Exercise.objects.get(id=DEVELOPMENT_EXERCISE_ID)
        old = Participant.objects.create(exercise=exercise, first_name="Miki", last_name="Saegusa", email="miki.saegusa@deathlabs.io", role=Participant.Role.ISSM)
        other = Participant.objects.create(exercise=exercise, first_name="Other", last_name="Person", role=Participant.Role.OPFOR)
        call_command("seed", stdout=StringIO())
        self.assertFalse(Participant.objects.filter(id=old.id).exists())
        self.assertTrue(Participant.objects.filter(id=other.id).exists())
        self.assertEqual(exercise.participants.filter(role=Participant.Role.ISSM).count(), 1)

    def test_seed_rejects_extra_custom_participants_without_changes(self):
        call_command("seed", stdout=StringIO())
        exercise = Exercise.objects.get(id=DEVELOPMENT_EXERCISE_ID)
        other = Participant.objects.create(exercise=exercise, first_name="Other", last_name="Person", role=Participant.Role.ISSM)
        with self.assertRaisesRegex(RuntimeError, "exceeds its limit"):
            call_command("seed", stdout=StringIO())
        self.assertTrue(Participant.objects.filter(id=other.id).exists())
        self.assertEqual(exercise.participants.filter(role=Participant.Role.ISSM).count(), 2)

    def test_seed_preserves_obsolete_participants_with_responses(self):
        call_command("seed", stdout=StringIO())
        exercise = Exercise.objects.get(id=DEVELOPMENT_EXERCISE_ID)
        old = Participant.objects.create(exercise=exercise, first_name="Miki", last_name="Saegusa", email="miki.saegusa@deathlabs.io", role=Participant.Role.ISSM)
        response = Response.objects.create(participant=old, inject=Inject.objects.filter(event__exercise=exercise).first(), text="Recorded response")
        with self.assertRaisesRegex(RuntimeError, "have responses"):
            call_command("seed", stdout=StringIO())
        self.assertTrue(Participant.objects.filter(id=old.id).exists())
        self.assertTrue(Response.objects.filter(id=response.id).exists())

    def test_seed_participants_creates_users_idempotently(self):
        user = get_user_model().objects.create_user(username="creator")
        exercise = Exercise.objects.create(
            title="Test exercise",
            scheduled_start_time=datetime(2026, 11, 16, 13, tzinfo=UTC),
            scheduled_end_time=datetime(2026, 11, 16, 15, tzinfo=UTC),
            created_by=user,
            updated_by=user,
        )

        self.assertEqual(seed_participants(exercise.id), (20, 0))
        self.assertEqual(seed_participants(exercise.id), (0, 20))
        self.assertEqual(get_user_model().objects.count(), 21)
        self.assertEqual(Participant.objects.count(), 20)

    def test_seed_replaces_previous_facilitator_without_changing_record(self):
        creator = get_user_model().objects.create_user(username="creator")
        old_user = get_user_model().objects.create_user(username="Ishiro Serizawa")
        exercise = Exercise.objects.create(
            title="Test exercise",
            scheduled_start_time=datetime(2026, 11, 16, 13, tzinfo=UTC),
            scheduled_end_time=datetime(2026, 11, 16, 15, tzinfo=UTC),
            created_by=creator,
            updated_by=creator,
        )
        participant = Participant.objects.create(
            exercise=exercise, user=old_user, first_name="Ishiro", last_name="Serizawa",
            email="ishiro.serizawa@deathlabs.io", role=Participant.Role.FACILITATOR,
        )
        exercise.facilitator = participant
        exercise.save(update_fields=["facilitator"])

        seed_participants(exercise.id)
        participant.refresh_from_db()
        self.assertEqual(participant.email, "justin.hartung@deathlabs.io")
        self.assertEqual(participant.user.username, "Justin Hartung")
        self.assertEqual(exercise.facilitator_id, participant.id)
        self.assertFalse(exercise.participants.filter(email="ishiro.serizawa@deathlabs.io").exists())
