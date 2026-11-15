#!/usr/bin/env python
"""Seed an exercise with Godzilla character participants."""

# Standard library imports.
import argparse
import os
from collections import Counter
from uuid import UUID

# Third party imports.
import django
from django.db import transaction

# Constants.
PARTICIPANTS = (
    ("Ishiro", "Serizawa", "facilitator"),
    ("Ilene", "Chen", "facilitator"),
    ("Ling", "Chen", "facilitator"),
    ("Mark", "Russell", "facilitator"),
    ("Emma", "Russell", "facilitator"),
    ("Madison", "Russell", "facilitator"),
    ("Ford", "Brody", "facilitator"),
    ("Elle", "Brody", "facilitator"),
    ("Joe", "Brody", "facilitator"),
    ("Sandra", "Brody", "facilitator"),
    ("Daisuke", "Serizawa", "information_system_owner"),
    ("Emiko", "Yamane", "information_system_owner"),
    ("Hideto", "Ogata", "information_system_owner"),
    ("Shinkichi", "Yamada", "information_system_owner"),
    ("Miki", "Saegusa", "information_system_security_manager"),
    ("Yuri", "Tachibana", "information_system_security_manager"),
    ("Akane", "Yashiro", "information_system_security_manager"),
    ("Sara", "Yuhara", "information_system_security_manager"),
    ("Shinichi", "Ozaki", "information_system_security_officer"),
    ("Miyuki", "Otonashi", "information_system_security_officer"),
    ("Douglas", "Gordon", "information_system_security_officer"),
    ("Kazuma", "Aoki", "information_system_security_officer"),
    ("Azusa", "Gojo", "information_system_security_officer"),
    ("Kenichiro", "Terasawa", "information_system_security_officer"),
    ("Chiaki", "Morimura", "information_system_security_officer"),
    ("Hajime", "Kudo", "information_system_security_officer"),
    ("Kiriko", "Tsujimori", "system_administrator"),
    ("Yuji", "Shinoda", "system_administrator"),
    ("Io", "Shinoda", "system_administrator"),
    ("Koichi", "Shikishima", "system_administrator"),
    ("Noriko", "Oishi", "system_administrator"),
    ("Sosaku", "Tachibana", "system_administrator"),
    ("Kenji", "Noda", "system_administrator"),
    ("Shiro", "Mizushima", "system_administrator"),
    ("Rando", "Yaguchi", "cybersecurity_service_provider"),
    ("Kayoko", "Patterson", "cybersecurity_service_provider"),
    ("Yoji", "Akitsu", "opposing_force"),
    ("Sumiko", "Ota", "opposing_force"),
    ("Hideki", "Akasaka", "opposing_force"),
    ("Yuki", "Ichinose", "opposing_force"),
)

EXPECTED_ROLE_COUNTS = {
    "facilitator": 10,
    "information_system_owner": 4,
    "information_system_security_manager": 4,
    "information_system_security_officer": 8,
    "system_administrator": 8,
    "cybersecurity_service_provider": 2,
    "opposing_force": 4,
}


def parse_args() -> argparse.Namespace:
    """Parse the command-line arguments."""
    parser = argparse.ArgumentParser(
        description="Seed an exercise with Godzilla character participants.",
    )
    parser.add_argument(
        "exercise_id",
        type=UUID,
        help="UUID of the exercise to seed.",
    )
    return parser.parse_args()


def seed_participants(exercise_id: UUID) -> tuple[int, int]:
    """Create or update the seed participants for one exercise."""
    from exercises.models import Exercise, Participant

    exercise = Exercise.objects.get(id=exercise_id)
    created_count = 0
    updated_count = 0

    with transaction.atomic():
        for first_name, last_name, role in PARTICIPANTS:
            email = f"{first_name}.{last_name}@deathlabs.io".lower()
            _, created = Participant.objects.update_or_create(
                exercise=exercise,
                email=email,
                defaults={
                    "first_name": first_name,
                    "last_name": last_name,
                    "role": role,
                },
            )
            if created:
                created_count += 1
            else:
                updated_count += 1

    return created_count, updated_count


def main() -> None:
    """Configure Django and seed the selected exercise."""
    args = parse_args()
    role_counts = Counter(role for _, _, role in PARTICIPANTS)
    if dict(role_counts) != EXPECTED_ROLE_COUNTS:
        raise RuntimeError("The participant roster has incorrect role counts.")

    os.environ.setdefault("DJANGO_SETTINGS_MODULE", "kaiju.settings")
    django.setup()

    from exercises.models import Exercise

    try:
        created_count, updated_count = seed_participants(args.exercise_id)
    except Exercise.DoesNotExist:
        raise SystemExit(f"Exercise {args.exercise_id} does not exist.") from None

if __name__ == "__main__":
    main()
