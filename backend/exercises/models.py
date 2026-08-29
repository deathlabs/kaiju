# Standard library imports.
from uuid import uuid4

# Third party imports.
from django.conf import settings
from django.db import models


class Exercise(models.Model):
    """Incident response tabletop exercise."""

    class Status(models.TextChoices):
        PLANNED = "planned"
        PREPARED = "prepared"
        IN_PROGRESS = "in_progress"
        COMPLETED = "completed"

    class Type(models.TextChoices):
        DISCUSSION = "discussion"
        DISCUSSION_AND_HANDS_ON = "discussion_and_hands_on"

    id = models.UUIDField(primary_key=True, default=uuid4, editable=False)
    created_at = models.DateTimeField(auto_now_add=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        related_name="exercises_created",
        on_delete=models.PROTECT,
    )
    facilitators = models.ManyToManyField(
        settings.AUTH_USER_MODEL,
        related_name="exercises_facilitated",
        blank=True,
    )
    references = models.ManyToManyField(
        "references.Reference",
        related_name="exercises",
        blank=True,
    )
    objectives = models.ManyToManyField(
        "objectives.Objective",
        related_name="exercises",
        blank=True,
    )
    type = models.CharField(
        max_length=30,
        choices=Type.choices,
        default=Type.DISCUSSION,
    )
    start_date_time = models.DateTimeField()
    end_date_time = models.DateTimeField()
    title = models.CharField(max_length=100)
    scenario = models.TextField()
    red_team_coordinated_at = models.DateTimeField(null=True, blank=True)
    read_aheads_sent_at = models.DateTimeField(null=True, blank=True)
    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.PLANNED,
    )
    updated_at = models.DateTimeField(auto_now=True)


class Participant(models.Model):
    class Role(models.TextChoices):
        ISO = "information_system_owner"
        ISSM = "information_system_security_manager"
        ISSO = "information_system_security_officer"
        SYSTEM_ADMINISTRATOR = "system_administrator"
        CSSP = "cybersecurity_service_provider"
        USER = "user"
        ATTACKER = "attacker"

    id = models.UUIDField(primary_key=True, default=uuid4, editable=False)
    exercise = models.ForeignKey(
        Exercise,
        related_name="participants",
        on_delete=models.CASCADE,
    )
    first_name = models.CharField(max_length=100)
    last_name = models.CharField(max_length=100)
    email = models.EmailField()
    role = models.CharField(
        max_length=40,
        choices=Role.choices,
    )

    class Meta:
        constraints = (
            models.UniqueConstraint(
                fields=["exercise", "email"],
                name="unique_participant_per_exercise",
            ),
        )


class FacilitatorQuestion(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid4, editable=False)
    exercise = models.ForeignKey(
        Exercise,
        related_name="facilitator_questions",
        on_delete=models.CASCADE,
    )
    related_objectives = models.ManyToManyField(
        "objectives.Objective",
        related_name="facilitator_questions",
        blank=True,
    )
    question = models.TextField()
    number = models.PositiveIntegerField()
    expected_answer = models.TextField(blank=True)

    class Meta:
        constraints = (
            models.UniqueConstraint(
                fields=["exercise", "number"],
                name="unique_facilitator_question_number_per_exercise",
            ),
        )


class Event(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid4, editable=False)
    exercise = models.ForeignKey(
        Exercise,
        related_name="events",
        on_delete=models.CASCADE,
    )
    number = models.PositiveIntegerField()
    description = models.TextField()
    expected_actions = models.TextField()
    related_objectives = models.ManyToManyField(
        "objectives.Objective",
        related_name="events",
        blank=True,
    )

    class Meta:
        constraints = (
            models.UniqueConstraint(
                fields=["exercise", "number"],
                name="unique_event_number_per_exercise",
            ),
        )


class Inject(models.Model):
    class DeliveryMethod(models.TextChoices):
        INDEX_CARD = "index_card"
        PHONE_CALL = "phone_call"
        EMAIL = "email"
        CHAT_MESSAGE = "chat_message"

    id = models.UUIDField(primary_key=True, default=uuid4, editable=False)
    event = models.ForeignKey(
        Event,
        related_name="injects",
        on_delete=models.CASCADE,
    )
    number = models.CharField(max_length=10)
    scheduled_start_time = models.DateTimeField()
    delivery_method = models.CharField(max_length=20, choices=DeliveryMethod.choices)
    sender = models.CharField(max_length=100)
    recipient = models.CharField(max_length=100)
    message = models.TextField()

    class Meta:
        constraints = (
            models.UniqueConstraint(
                fields=["event", "number"],
                name="unique_inject_number_per_event",
            ),
        )
