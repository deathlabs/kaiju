"""Tests for local development data seeding."""

# Standard library imports.
from datetime import UTC, datetime
from io import StringIO
from uuid import UUID

# Third party imports.
from django.contrib.auth import get_user_model
from django.core.management import call_command
from django.test import TestCase

# Local imports.
from exercises.management.commands.seed import DEVELOPMENT_EXERCISE_ID
from exercises.models import Event, Exercise, Inject, Participant
from objectives.models import Objective
from references.models import Reference
from seed_data import PARTICIPANTS, seed_participants


class SeedDevelopmentDataTests(TestCase):
    def test_seed_is_idempotent(self):
        first_output = StringIO()
        second_output = StringIO()

        call_command("seed", stdout=first_output)
        call_command("seed", stdout=second_output)

        self.assertEqual(get_user_model().objects.count(), 41)
        self.assertTrue(
            get_user_model().objects.filter(username="Ishiro Serizawa").exists(),
        )
        self.assertEqual(Exercise.objects.count(), 7)
        self.assertEqual(Participant.objects.count(), 281)
        self.assertEqual(Reference.objects.count(), 1)
        self.assertEqual(Objective.objects.count(), 4)
        self.assertEqual(Event.objects.count(), 21)
        self.assertEqual(Inject.objects.count(), 24)
        exercise = Exercise.objects.get(id=DEVELOPMENT_EXERCISE_ID)
        self.assertEqual(exercise.title, "Perimeter Breach")
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
            self.assertEqual(exercise.participants.count(), 41 if exercise.id == DEVELOPMENT_EXERCISE_ID else 40)
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
            email = f"{first_name}.{last_name}@deathlabs.io".lower()
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

    def test_seed_participants_creates_users_idempotently(self):
        user = get_user_model().objects.create_user(username="creator")
        exercise = Exercise.objects.create(
            title="Test exercise",
            scheduled_start_time=datetime(2026, 11, 16, 13, tzinfo=UTC),
            scheduled_end_time=datetime(2026, 11, 16, 15, tzinfo=UTC),
            created_by=user,
            updated_by=user,
        )

        self.assertEqual(seed_participants(exercise.id), (40, 0))
        self.assertEqual(seed_participants(exercise.id), (0, 40))
        self.assertEqual(get_user_model().objects.count(), 41)
        self.assertEqual(Participant.objects.count(), 40)
