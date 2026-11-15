"""Seed the local development database."""

# Standard library imports.
from datetime import UTC, datetime
from uuid import UUID

# Third party imports.
from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand
from django.db import transaction

# Local imports.
from exercises.models import Exercise
from seed_data import PARTICIPANTS, seed_participants

# Constants.
DEVELOPMENT_EXERCISE_ID = UUID("00000000-0000-0000-0000-000000000001")
DEVELOPMENT_USERNAME = "Vic Fernandez III"
FACILITATOR_ROLE = "facilitator"


class Command(BaseCommand):
    """Create or update the local development data."""

    help = "Create or update the local development exercise and participants."

    @transaction.atomic
    def handle(self, *args, **options) -> None:
        user, user_created = get_user_model().objects.update_or_create(
            username=DEVELOPMENT_USERNAME,
            defaults={
                "email": "victor@deathlabs.io",
                "first_name": "Vic",
                "last_name": "Fernandez III",
            },
        )
        facilitator_user_created_count = 0
        facilitator_user_updated_count = 0
        for first_name, last_name, role in PARTICIPANTS:
            if role != FACILITATOR_ROLE:
                continue

            _, created = get_user_model().objects.update_or_create(
                username=f"{first_name} {last_name}",
                defaults={
                    "email": f"{first_name}.{last_name}@deathlabs.io".lower(),
                    "first_name": first_name,
                    "last_name": last_name,
                },
            )
            if created:
                facilitator_user_created_count += 1
            else:
                facilitator_user_updated_count += 1

        _, exercise_created = Exercise.objects.update_or_create(
            id=DEVELOPMENT_EXERCISE_ID,
            defaults={
                "created_by": user,
                "updated_by": user,
                "scheduled_start_time": datetime(2026, 11, 16, 13, tzinfo=UTC),
                "scheduled_end_time": datetime(2026, 11, 16, 15, tzinfo=UTC),
                "title": "Godzilla Incident Response Exercise",
                "type": Exercise.Type.DISCUSSION_AND_HANDS_ON,
                "scenario": (
                    "Unknown outbound network activity was observed from the "
                    "production environment."
                ),
            },
        )
        _, _ = seed_participants(DEVELOPMENT_EXERCISE_ID,)
