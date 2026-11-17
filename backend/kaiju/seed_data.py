#!/usr/bin/env python
"""Seed an exercise with Godzilla character participants."""

# Standard library imports.
import argparse
import os
from collections import Counter
from uuid import UUID

# Third party imports.
import django
from django.contrib.auth import get_user_model
from django.db import transaction

# Constants.
PARTICIPANTS = (
    ("Justin", "Hartung", "facilitator"),
    ("Ilene", "Chen", "facilitator"),
    ("Ling", "Chen", "facilitator"),
    ("Daisuke", "Serizawa", "information_system_owner"),
    ("Vic", "Fernandez III", "information_system_security_manager"),
    ("Shinichi", "Ozaki", "information_system_security_officer"),
    ("Miyuki", "Otonashi", "information_system_security_officer"),
    ("Douglas", "Gordon", "information_system_security_officer"),
    ("Kazuma", "Aoki", "information_system_security_officer"),
    ("Kiriko", "Tsujimori", "system_administrator"),
    ("Yuji", "Shinoda", "system_administrator"),
    ("Io", "Shinoda", "system_administrator"),
    ("Koichi", "Shikishima", "system_administrator"),
    ("Hiroshi", "Jinkawa", "user"),
    ("Rando", "Yaguchi", "cybersecurity_service_provider"),
    ("Kayoko", "Patterson", "cybersecurity_service_provider"),
    ("Yoji", "Akitsu", "opposing_force"),
    ("Sumiko", "Ota", "opposing_force"),
    ("Hideki", "Akasaka", "opposing_force"),
    ("Yuki", "Ichinose", "opposing_force"),
)

EXPECTED_ROLE_COUNTS = {
    "facilitator": 3,
    "information_system_owner": 1,
    "information_system_security_manager": 1,
    "information_system_security_officer": 4,
    "system_administrator": 4,
    "user": 1,
    "cybersecurity_service_provider": 2,
    "opposing_force": 4,
}

OBSOLETE_PARTICIPANTS = {
    "facilitator": ("mark.russell", "emma.russell", "madison.russell", "ford.brody", "elle.brody", "joe.brody", "sandra.brody"),
    "information_system_owner": ("emiko.yamane", "hideto.ogata", "shinkichi.yamada"),
    "information_system_security_manager": ("miki.saegusa", "yuri.tachibana", "akane.yashiro", "sara.yuhara"),
    "information_system_security_officer": ("azusa.gojo", "kenichiro.terasawa", "chiaki.morimura", "hajime.kudo"),
    "system_administrator": ("noriko.oishi", "sosaku.tachibana", "kenji.noda", "shiro.mizushima"),
}


def participant_email(first_name: str, last_name: str) -> str:
    """Return the email address for a seeded participant."""
    if (first_name, last_name) == ("Vic", "Fernandez III"):
        return "victor@deathlabs.io"
    return f"{first_name}.{last_name}@deathlabs.io".lower()

# Each event contains its title, inject message, and expected response.
ADDITIONAL_EXERCISES = (
    (
        2,
        "King of the Payload",
        "A suspicious attachment reaches staff mailboxes and a workstation begins executing unknown code.",
        (
            (
                "Suspicious Attachment",
                "Several users report an unexpected invoice attachment. One workstation launched a script after the file was opened.",
                "Collect the message and endpoint evidence, identify affected users, and activate the response team.",
            ),
            (
                "Payload Execution",
                "Endpoint monitoring shows the script downloaded a payload and attempted to use a service account on another host.",
                "Isolate affected endpoints, investigate account use, preserve evidence, and notify stakeholders.",
            ),
            (
                "Clean Rebuild",
                "The affected workstation has been rebuilt and the service account credentials have been rotated.",
                "Validate the rebuild, monitor for recurrence, and record lessons for email and endpoint defenses.",
            ),
        ),
    ),
    (
        3,
        "Scorched Earth",
        "Production services become unavailable after an attacker gains privileged access to infrastructure management tools.",
        (
            (
                "Service Disruption",
                "Monitoring reports simultaneous failures across production services and a privileged login from an unfamiliar location.",
                "Assess service impact, verify the alert, and activate incident and continuity teams.",
            ),
            (
                "Destructive Commands",
                "Audit logs show the privileged account deleted configuration and attempted to remove backups.",
                "Revoke access, protect remaining backups, preserve logs, and determine the scope of destruction.",
            ),
            (
                "Restore Operations",
                "An isolated backup is available, but its integrity and recovery time are unknown.",
                "Test backup integrity, prioritize service restoration, and document recovery decisions and gaps.",
            ),
        ),
    ),
    (
        4,
        "Multi-Vector Strike",
        "A public-facing service experiences a traffic surge while staff receive targeted credential phishing messages.",
        (
            (
                "Concurrent Alerts",
                "The service provider reports elevated traffic and the help desk reports several credential phishing messages.",
                "Correlate alerts, assess service availability, and assign investigation leads.",
            ),
            (
                "Account Compromise",
                "A staff account entered credentials into the phishing site and is now issuing unusual cloud API requests.",
                "Contain the account, mitigate the traffic surge, preserve evidence, and coordinate communications.",
            ),
            (
                "Return to Service",
                "Traffic has stabilized and the account has been secured. Cloud activity logs are available for review.",
                "Verify service health, review unauthorized changes, and capture lessons from the coordinated response.",
            ),
        ),
    ),
    (
        5,
        "Atomic Exfiltration",
        "Unusual outbound transfers suggest that sensitive production data may have left the environment.",
        (
            (
                "Outbound Transfer",
                "Monitoring detects a large encrypted transfer from a production workload to an unfamiliar destination.",
                "Validate the alert, identify the workload and data at risk, and begin evidence preservation.",
            ),
            (
                "Data Exposure",
                "Access logs show an exposed service credential read sensitive records before the transfer began.",
                "Revoke the credential, contain the transfer, assess affected data, and notify appropriate stakeholders.",
            ),
            (
                "Exposure Assessment",
                "The transfer has stopped and investigators have identified the records accessed by the credential.",
                "Determine notification requirements, validate access controls, and document the incident and improvements.",
            ),
        ),
    ),
    (
        6,
        "Rogue Gallery",
        "Several legitimate accounts exhibit unusual activity after a third-party support session.",
        (
            (
                "Unusual Logins",
                "Multiple support accounts logged in outside their normal hours after a vendor maintenance session.",
                "Verify the activity with the vendor, identify affected accounts, and preserve access logs.",
            ),
            (
                "Privilege Abuse",
                "One support account created a new administrator and changed an audit logging setting.",
                "Disable unauthorized access, restore logging, investigate other accounts, and coordinate with the vendor.",
            ),
            (
                "Access Review",
                "The unauthorized administrator has been removed and the vendor has confirmed its support credentials were compromised.",
                "Review third-party access, validate monitoring, and record corrective actions and lessons learned.",
            ),
        ),
    ),
    (
        7,
        "Mutual Assured Disruption",
        "A critical external provider suffers an incident while internal systems report signs of compromise.",
        (
            (
                "Provider Warning",
                "A critical provider reports a security incident and asks customers to check for suspicious connections.",
                "Assess the provider dependency, review indicators, and activate communications and continuity plans.",
            ),
            (
                "Shared Dependency",
                "Internal logs show suspicious connections to the provider and a key service begins to fail.",
                "Contain affected connections, coordinate with the provider, and assess continuity and customer impact.",
            ),
            (
                "Coordinated Recovery",
                "The provider offers a clean endpoint and the internal team has verified an alternate service path.",
                "Validate the restored connection, coordinate service recovery, and document dependency risks and lessons.",
            ),
        ),
    ),
)


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
    from exercises.role_limits import ROLE_LIMITS

    exercise = Exercise.objects.get(id=exercise_id)
    created_count = 0
    updated_count = 0

    with transaction.atomic():
        exercise = Exercise.objects.select_for_update().get(id=exercise_id)
        obsolete_ids = []
        for role, names in OBSOLETE_PARTICIPANTS.items():
            emails = [f"{name}@deathlabs.io" for name in names]
            obsolete_ids.extend(exercise.participants.filter(role=role, email__in=emails).values_list("id", flat=True))
        obsolete = exercise.participants.filter(id__in=obsolete_ids)
        if obsolete.filter(responses__isnull=False).exists() or exercise.facilitator_id in obsolete_ids:
            raise RuntimeError("Cannot remove obsolete seed participants who have responses or are the facilitator.")
        obsolete.delete()

        for first_name, last_name, role in PARTICIPANTS:
            email = participant_email(first_name, last_name)
            user, _ = get_user_model().objects.update_or_create(
                username=f"{first_name} {last_name}",
                defaults={
                    "email": email,
                    "first_name": first_name,
                    "last_name": last_name,
                },
            )
            if role == "facilitator" and email == "justin.hartung@deathlabs.io":
                old_participant = exercise.participants.filter(
                    email="ishiro.serizawa@deathlabs.io", role=Participant.Role.FACILITATOR,
                ).first()
                if old_participant and not exercise.participants.filter(email=email).exists():
                    old_participant.first_name = first_name
                    old_participant.last_name = last_name
                    old_participant.email = email
                    if old_participant.user_id:
                        old_participant.user = user
                    old_participant.save(update_fields=["first_name", "last_name", "email", "user"])
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

        for role, limit in ROLE_LIMITS.items():
            if exercise.participants.filter(role=role).count() > limit:
                raise RuntimeError(f"Cannot seed exercise {exercise_id}: the {Participant.Role(role).label} role exceeds its limit of {limit}.")

    if exercise.facilitator_id is None:
        exercise.facilitator = (
            exercise.participants.filter(role=Participant.Role.FACILITATOR)
            .order_by("created_at", "id")
            .first()
        )
        exercise.save(update_fields=["facilitator"])

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
        seed_participants(args.exercise_id)
    except Exercise.DoesNotExist:
        raise SystemExit(f"Exercise {args.exercise_id} does not exist.") from None


if __name__ == "__main__":
    main()
