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
    updated_at = models.DateTimeField(auto_now=True)
    scheduled_start_time = models.DateTimeField()
    scheduled_end_time = models.DateTimeField()
    started_at = models.DateTimeField(null=True, blank=True)
    ended_at = models.DateTimeField(null=True, blank=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        related_name="exercises_created",
        on_delete=models.PROTECT,
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

    title = models.CharField(max_length=100)
    scenario = models.TextField()
    opfor_coordinated_at = models.DateTimeField(null=True, blank=True)
    read_aheads_sent_at = models.DateTimeField(null=True, blank=True)
    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.PLANNED,
    )


class Participant(models.Model):
    class Role(models.TextChoices):
        FACILITATOR = "facilitator"
        ISO = "information_system_owner"
        ISSM = "information_system_security_manager"
        ISSO = "information_system_security_officer"
        SYSTEM_ADMINISTRATOR = "system_administrator"
        USER = "user"
        CSSP = "cybersecurity_service_provider"
        OPFOR = "opposing_force"

    id = models.UUIDField(primary_key=True, default=uuid4, editable=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    exercise = models.ForeignKey(
        Exercise,
        related_name="participants",
        on_delete=models.CASCADE,
    )
    first_name = models.CharField(max_length=100)
    last_name = models.CharField(max_length=100)
    email = models.EmailField(
        null=True,
        blank=True,
    )
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


class Event(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid4, editable=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    started_at = models.DateTimeField(null=True, blank=True)
    ended_at = models.DateTimeField(null=True, blank=True)
    exercise = models.ForeignKey(
        Exercise,
        related_name="events",
        on_delete=models.CASCADE,
    )
    number = models.PositiveIntegerField()
    description = models.CharField(max_length=255)
    objectives = models.ManyToManyField(
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
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    scheduled_start_time = models.DateTimeField()
    started_at = models.DateTimeField(null=True, blank=True)
    ended_at = models.DateTimeField(null=True, blank=True)
    event = models.ForeignKey(
        Event,
        related_name="injects",
        on_delete=models.CASCADE,
    )
    recipient = models.ForeignKey(
        Participant,
        related_name="injects_received",
        on_delete=models.PROTECT,
    )
    number = models.CharField(max_length=10)
    delivery_method = models.CharField(
        max_length=20,
        choices=DeliveryMethod.choices,
    )
    sender = models.CharField(max_length=100)
    message = models.TextField()
    expected_response = models.TextField(blank=True)

    class Meta:
        constraints = (
            models.UniqueConstraint(
                fields=["event", "number"],
                name="unique_inject_number_per_event",
            ),
        )


class Response(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid4, editable=False)
    created_at = models.DateTimeField(auto_now_add=True)
    participant = models.ForeignKey(
        Participant,
        related_name="responses",
        on_delete=models.CASCADE,
    )
    inject = models.ForeignKey(
        Inject,
        related_name="responses",
        on_delete=models.CASCADE,
    )
    text = models.TextField()


class Finding(models.Model):
    class Type(models.TextChoices):
        SUSTAINMENT = "sustainment"
        IMPROVEMENT = "improvement"

    id = models.UUIDField(primary_key=True, default=uuid4, editable=False)
    created_at = models.DateTimeField(auto_now_add=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        related_name="findings_created",
        on_delete=models.PROTECT,
    )
    updated_at = models.DateTimeField(auto_now=True)
    type = models.CharField(max_length=20, choices=Type.choices)
    topic = models.CharField(max_length=50)
    observation = models.TextField()
    recommendation = models.TextField()
    exercise = models.ForeignKey(
        Exercise,
        related_name="findings",
        on_delete=models.CASCADE,
    )

    def __str__(self) -> str:
        return self.topic
