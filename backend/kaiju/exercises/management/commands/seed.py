"""Seed the local development database."""

# Standard library imports.
from datetime import UTC, datetime, timedelta
from uuid import UUID

# Third party imports.
from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand
from django.db import transaction
from objectives.models import Objective
from references.models import Reference
from seed_data import ADDITIONAL_EXERCISES, seed_participants

# Local imports.
from exercises.models import Event, Exercise, Inject, Participant

# Constants.
DEVELOPMENT_EXERCISE_ID = UUID("00000000-0000-0000-0000-000000000001")
DEVELOPMENT_USERNAME = "Vic Fernandez III"
REFERENCE_ID = UUID("00000000-0000-0000-0000-000000000010")
OBJECTIVES = (
    (
        "Execute the incident response plan",
        "Identify updates needed in the incident response plan.",
    ),
    (
        "Practice incident response",
        "Practice the actions required to respond to an intrusion.",
    ),
    (
        "Identify documentation gaps",
        "Identify documentation needed to execute the incident response plan.",
    ),
    (
        "Understand incident response roles",
        "Confirm that each team member understands their incident response role.",
    ),
)
EVENTS = (
    ("Detect", (0, 1, 3)),
    ("Respond", (0, 1, 2, 3)),
    ("Recover", (0, 1, 2, 3)),
)
INJECTS = (
    (
        1,
        "1A",
        18,
        5,
        Inject.DeliveryMethod.EMAIL,
        Inject.Role.CSSP,
        Inject.Role.ISSO,
        "Monitoring detected anomalous outbound DNS queries and connections from production. Please investigate and report your findings.",
        "Notify the ISSM, activate the incident response team, and begin triage.",
    ),
    (
        2,
        "2A",
        18,
        35,
        Inject.DeliveryMethod.CHAT_MESSAGE,
        Inject.Role.SYSTEM_ADMINISTRATOR,
        Inject.Role.ISSM,
        "The traffic originated in the Kubernetes cluster. The affected namespace and workload are not yet known.",
        "Identify the affected workload, preserve evidence, and assess containment options.",
    ),
    (
        2,
        "2B",
        18,
        45,
        Inject.DeliveryMethod.CHAT_MESSAGE,
        Inject.Role.CSSP,
        Inject.Role.ISO,
        "Please provide an update on the investigation and response plan.",
        "Communicate the incident status, impact, and planned response to stakeholders.",
    ),
    (
        3,
        "3A",
        19,
        15,
        Inject.DeliveryMethod.CHAT_MESSAGE,
        Inject.Role.ISSO,
        Inject.Role.ISSM,
        "Malware was found in a registrar backend container. Its deployment configuration permits all outbound traffic.",
        "Contain and eradicate the malware, assess the impact, and plan recovery.",
    ),
    (
        3,
        "3B",
        19,
        40,
        Inject.DeliveryMethod.CHAT_MESSAGE,
        Inject.Role.ISSM,
        Inject.Role.CSSP,
        "The team reviewed outbound traffic, deployment code, dependencies, and malware scan results.",
        "Confirm recovery readiness, validate restored services, and report the response status.",
    ),
    (
        3,
        "3C",
        19,
        45,
        Inject.DeliveryMethod.CHAT_MESSAGE,
        Inject.Role.CSSP,
        Inject.Role.ISSM,
        "Please share the recovery status and lessons learned from the incident.",
        "Document the incident, identify improvements, and prepare the after-action review.",
    ),
)


class Command(BaseCommand):
    """Create or update the local development data."""

    help = "Create or update the local development exercise and related data."

    @transaction.atomic
    def handle(self, *args, **options) -> None:
        user, _ = get_user_model().objects.update_or_create(
            username=DEVELOPMENT_USERNAME,
            defaults={
                "email": "victor@deathlabs.io",
                "first_name": "Vic",
                "last_name": "Fernandez III",
            },
        )
        exercise, _ = Exercise.objects.update_or_create(
            id=DEVELOPMENT_EXERCISE_ID,
            defaults={
                "created_by": user,
                "updated_by": user,
                "scheduled_start_time": datetime(2026, 11, 16, 18, tzinfo=UTC),
                "scheduled_end_time": datetime(2026, 11, 16, 20, tzinfo=UTC),
                "title": "Perimeter Breach",
                "type": Exercise.Type.DISCUSSION_AND_HANDS_ON,
                "scenario": (
                    "At 0400 EST on November 16, 2026, anomalous outbound "
                    "network activity was observed from the production environment."
                ),
            },
        )
        seed_participants(DEVELOPMENT_EXERCISE_ID)
        Participant.objects.update_or_create(
            exercise=exercise,
            email=user.email,
            defaults={
                "first_name": user.first_name,
                "last_name": user.last_name,
                "role": Participant.Role.ISSM,
            },
        )
        reference, _ = Reference.objects.update_or_create(
            id=REFERENCE_ID,
            defaults={
                "title": "NIST SP 800-61 Rev. 3",
                "type": Reference.Type.GUIDELINE,
                "url": "https://nvlpubs.nist.gov/nistpubs/SpecialPublications/NIST.SP.800-61r3.pdf",
            },
        )
        exercise.references.add(reference)
        objectives = []
        for index, (title, description) in enumerate(OBJECTIVES, start=1):
            objective, _ = Objective.objects.update_or_create(
                id=UUID(int=20 + index),
                defaults={"title": title, "description": description},
            )
            objectives.append(objective)
        exercise.objectives.add(*objectives)

        for number, (description, objective_indexes) in enumerate(EVENTS, start=1):
            event, _ = Event.objects.update_or_create(
                exercise=exercise,
                number=number,
                defaults={"position": number, "description": description},
            )
            event.objectives.add(*(objectives[index] for index in objective_indexes))

        for (
            event_number,
            number,
            hour,
            minute,
            method,
            sender,
            recipient,
            message,
            expected,
        ) in INJECTS:
            Inject.objects.update_or_create(
                event=exercise.events.get(number=event_number),
                number=number,
                defaults={
                    "scheduled_start_time": datetime(
                        2026, 11, 16, hour, minute, tzinfo=UTC
                    ),
                    "delivery_method": method,
                    "sender": sender,
                    "recipient": recipient,
                    "message": message,
                    "expected_response": expected,
                },
            )

        for index, title, scenario, events in ADDITIONAL_EXERCISES:
            start_time = datetime(2026, 11, 16, 18, tzinfo=UTC) + timedelta(
                weeks=index - 1
            )
            exercise, _ = Exercise.objects.update_or_create(
                id=UUID(int=index),
                defaults={
                    "created_by": user,
                    "updated_by": user,
                    "scheduled_start_time": start_time,
                    "scheduled_end_time": start_time + timedelta(hours=2),
                    "title": title,
                    "type": Exercise.Type.DISCUSSION_AND_HANDS_ON,
                    "scenario": scenario,
                },
            )
            seed_participants(exercise.id)
            exercise.references.add(reference)
            exercise.objectives.add(*objectives)
            for number, (description, message, expected) in enumerate(events, start=1):
                event, _ = Event.objects.update_or_create(
                    exercise=exercise,
                    number=number,
                    defaults={"position": number, "description": description},
                )
                event.objectives.add(*objectives)
                sender, recipient = (
                    (Inject.Role.CSSP, Inject.Role.ISSO),
                    (Inject.Role.SYSTEM_ADMINISTRATOR, Inject.Role.ISSM),
                    (Inject.Role.ISSM, Inject.Role.ISO),
                )[number - 1]
                Inject.objects.update_or_create(
                    event=event,
                    number=f"{number}A",
                    defaults={
                        "scheduled_start_time": start_time
                        + timedelta(minutes=(5, 45, 95)[number - 1]),
                        "delivery_method": Inject.DeliveryMethod.CHAT_MESSAGE,
                        "sender": sender,
                        "recipient": recipient,
                        "message": message,
                        "expected_response": expected,
                    },
                )
