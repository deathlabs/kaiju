"""Tests for local development data seeding."""

# Standard library imports.
from io import StringIO

# Third party imports.
from django.contrib.auth import get_user_model
from django.core.management import call_command
from django.test import TestCase

# Local imports.
from exercises.management.commands.seed import DEVELOPMENT_EXERCISE_ID
from exercises.models import Exercise, Participant


class SeedDevelopmentDataTests(TestCase):
    def test_seed_is_idempotent(self):
        first_output = StringIO()
        second_output = StringIO()

        call_command("seed", stdout=first_output)
        call_command("seed", stdout=second_output)

        self.assertEqual(get_user_model().objects.count(), 11)
        self.assertTrue(
            get_user_model().objects.filter(username="Ishiro Serizawa").exists(),
        )
        self.assertEqual(Exercise.objects.count(), 1)
        self.assertEqual(Participant.objects.count(), 40)
        self.assertTrue(
            Exercise.objects.filter(id=DEVELOPMENT_EXERCISE_ID).exists(),
        )
        self.assertIn("participants created 40", first_output.getvalue())
        self.assertIn("facilitator users created 10", first_output.getvalue())
        self.assertIn("participants created 0", second_output.getvalue())
        self.assertIn("participants updated 40", second_output.getvalue())
        self.assertIn("facilitator users created 0", second_output.getvalue())
        self.assertIn("facilitator users updated 10", second_output.getvalue())
