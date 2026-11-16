# Standard library imports.
from datetime import datetime
from uuid import UUID

# Third party imports.
from ninja import Schema
from pydantic import EmailStr, Field

# Local imports.
from exercises.models import Exercise, Finding, Inject, Participant, Response
from objectives.schemas import ObjectiveCreateSchema, ObjectiveSchema
from references.schemas import ReferenceCreateSchema, ReferenceSchema


class BadRequestResponseSchema(Schema):
    """The fields returned when a request is invalid."""

    message: str


class NotFoundResponseSchema(Schema):
    """The fields returned when a resource is not found."""

    message: str


class ExerciseUserSchema(Schema):
    """The user fields displayed for exercise changes."""

    username: str
    first_name: str
    last_name: str


class ParticipantSchema(Schema):
    """The fields of a Participant."""

    id: UUID
    first_name: str
    last_name: str
    email: EmailStr | None = None
    role: Participant.Role


class ParticipantCreateSchema(Schema):
    """The fields required to create a Participant."""

    first_name: str
    last_name: str
    email: EmailStr | None = None
    role: Participant.Role


class ParticipantUpdateSchema(Schema):
    """The fields that can be updated on a Participant."""

    first_name: str | None = None
    last_name: str | None = None
    email: EmailStr | None = None
    role: Participant.Role | None = None


class ResponseSchema(Schema):
    """The fields of a Response."""

    id: UUID
    created_at: datetime
    participant: ParticipantSchema
    text: str
    type: Response.Type


class ResponseCreateSchema(Schema):
    """The fields required to create a Response."""

    participant_id: UUID
    text: str


class CardReplyCreateSchema(Schema):
    """The fields required to reply to an inject card."""

    type: Response.Type
    text: str = Field(min_length=1)


class InjectSchema(Schema):
    """The fields of an Inject."""

    id: UUID
    created_at: datetime
    updated_at: datetime
    scheduled_start_time: datetime
    started_at: datetime | None
    ended_at: datetime | None
    number: str
    delivery_method: Inject.DeliveryMethod
    sender: Inject.Role
    recipient: Inject.Role
    message: str
    expected_response: str
    responses: list[ResponseSchema]


class InjectCreateSchema(Schema):
    """The fields required to create an Inject."""

    recipient: Inject.Role
    number: str
    scheduled_start_time: datetime
    delivery_method: Inject.DeliveryMethod
    sender: Inject.Role
    message: str
    expected_response: str = ""


class InjectUpdateSchema(Schema):
    """The fields that can be updated on an Inject."""

    recipient: Inject.Role | None = None
    number: str | None = None
    scheduled_start_time: datetime | None = None
    started_at: datetime | None = None
    ended_at: datetime | None = None
    delivery_method: Inject.DeliveryMethod | None = None
    sender: Inject.Role | None = None
    message: str | None = None
    expected_response: str | None = None


class EventSchema(Schema):
    """The fields of an Event."""

    id: UUID
    created_at: datetime
    updated_at: datetime
    started_at: datetime | None
    ended_at: datetime | None
    number: int
    description: str
    objectives: list[ObjectiveSchema]
    injects: list[InjectSchema]


class EventCreateSchema(Schema):
    """The fields required to create an Event."""

    number: int
    description: str
    new_objectives: list[ObjectiveCreateSchema] = Field(default_factory=list)
    new_injects: list[InjectCreateSchema] = Field(default_factory=list)
    objective_ids: list[UUID]


class EventOrderSchema(Schema):
    """The event IDs in display order."""

    event_ids: list[UUID]


class EventUpdateSchema(Schema):
    """The fields that can be updated on an Event."""

    number: int | None = None
    description: str | None = None
    new_objectives: list[ObjectiveCreateSchema] | None = None
    new_injects: list[InjectCreateSchema] | None = None
    objective_ids: list[UUID] | None = None
    started_at: datetime | None = None
    ended_at: datetime | None = None


class FindingSchema(Schema):
    """The fields of a Finding."""

    id: UUID
    created_at: datetime
    created_by_id: int
    updated_at: datetime
    type: Finding.Type
    topic: str
    observation: str
    recommendation: str


class FindingCreateSchema(Schema):
    """The fields required to create a Finding."""

    type: Finding.Type
    topic: str
    observation: str
    recommendation: str


class FindingUpdateSchema(Schema):
    """The fields that can be updated on a Finding."""

    type: Finding.Type | None = None
    topic: str | None = None
    observation: str | None = None
    recommendation: str | None = None


class ExerciseSchema(Schema):
    """The fields of an Exercise."""

    id: UUID
    created_at: datetime
    created_by: ExerciseUserSchema
    updated_at: datetime
    updated_by: ExerciseUserSchema
    scheduled_start_time: datetime
    scheduled_end_time: datetime
    started_at: datetime | None
    ended_at: datetime | None
    facilitator_id: UUID | None
    assistant_facilitator_ids: list[UUID]
    participants: list[ParticipantSchema]
    references: list[ReferenceSchema]
    objectives: list[ObjectiveSchema]
    events: list[EventSchema]
    type: Exercise.Type
    title: str
    scenario: str
    opfor_coordinated_at: datetime | None
    read_aheads_sent_at: datetime | None
    status: Exercise.Status
    findings: list[FindingSchema]


class ParticipantSummarySchema(Schema):
    """The participant fields displayed on an exercise card."""

    id: UUID
    first_name: str
    last_name: str
    role: Participant.Role


class ExerciseListSchema(Schema):
    """The abbreviated fields of an Exercise."""

    id: UUID
    created_by: ExerciseUserSchema
    updated_by: ExerciseUserSchema
    scheduled_start_time: datetime
    scheduled_end_time: datetime
    facilitator_id: UUID | None
    assistant_facilitator_ids: list[UUID]
    participants: list[ParticipantSummarySchema]
    objectives: list[ObjectiveSchema]
    references: list[ReferenceSchema]
    scenario: str
    type: Exercise.Type
    title: str
    status: Exercise.Status


class ExerciseCreateSchema(Schema):
    """The fields required to create an Exercise."""

    new_objectives: list[ObjectiveCreateSchema] = Field(default_factory=list)
    new_references: list[ReferenceCreateSchema] = Field(default_factory=list)
    objective_ids: list[UUID] = Field(default_factory=list)
    reference_ids: list[UUID] = Field(default_factory=list)
    facilitator_username: str | None = None
    type: Exercise.Type
    scheduled_start_time: datetime
    scheduled_end_time: datetime
    title: str
    scenario: str


class ExerciseUpdateSchema(Schema):
    """The fields that can be updated on an Exercise."""

    new_objectives: list[ObjectiveCreateSchema] | None = None
    new_references: list[ReferenceCreateSchema] | None = None
    reference_ids: list[UUID] | None = None
    objective_ids: list[UUID] | None = None
    facilitator_username: str | None = None
    facilitator_id: UUID | None = None
    assistant_facilitator_ids: list[UUID] | None = None
    type: Exercise.Type | None = None
    scheduled_start_time: datetime | None = None
    scheduled_end_time: datetime | None = None
    started_at: datetime | None = None
    ended_at: datetime | None = None
    title: str | None = None
    scenario: str | None = None
    opfor_coordinated_at: datetime | None = None
    read_aheads_sent_at: datetime | None = None
    status: Exercise.Status | None = None


class AfterActionReportSchema(Schema):
    """The fields of an After Action Report."""

    exercise: ExerciseSchema


class ChatTextSchema(Schema):
    """The text of a chat message."""

    text: str = Field(max_length=10000)


class ChatMessageSchema(Schema):
    """A current exercise chat message."""

    id: UUID
    author_name: str
    created_at: datetime
    text: str
