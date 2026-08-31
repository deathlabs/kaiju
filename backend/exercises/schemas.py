# Standard library imports.
from datetime import datetime
from uuid import UUID

# Third party imports.
from ninja import Schema
from objectives.schemas import ObjectiveSchema
from pydantic import EmailStr
from references.schemas import ReferenceSchema

# Local imports.
from exercises.models import Exercise, Inject, Participant


class BadRequestResponseSchema(Schema):
    """The fields returned when a request is invalid."""

    message: str


class NotFoundResponseSchema(Schema):
    """The fields returned when a resource is not found."""

    message: str


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


class EventSchema(Schema):
    """The fields of an Event."""

    id: UUID
    created_at: datetime
    updated_at: datetime
    number: int
    description: str
    expected_actions: str
    objectives: list[ObjectiveSchema]


class EventCreateSchema(Schema):
    """The fields required to create an Event."""

    number: int
    description: str
    expected_actions: str
    objective_ids: list[UUID]


class EventUpdateSchema(Schema):
    """The fields that can be updated on an Event."""

    number: int | None = None
    description: str | None = None
    expected_actions: str | None = None
    objective_ids: list[UUID] | None = None


class InjectSchema(Schema):
    """The fields of an Inject."""

    id: UUID
    created_at: datetime
    updated_at: datetime
    number: str
    scheduled_start_time: datetime
    delivery_method: Inject.DeliveryMethod
    sender: str
    recipient: str
    message: str


class InjectCreateSchema(Schema):
    """The fields required to create an Inject."""

    number: str
    scheduled_start_time: datetime
    delivery_method: Inject.DeliveryMethod
    sender: str
    recipient: str
    message: str


class InjectUpdateSchema(Schema):
    """The fields that can be updated on an Inject."""

    number: str | None = None
    scheduled_start_time: datetime | None = None
    delivery_method: Inject.DeliveryMethod | None = None
    sender: str | None = None
    recipient: str | None = None
    message: str | None = None


class QuestionSchema(Schema):
    """The fields of a Question."""

    id: UUID
    created_at: datetime
    updated_at: datetime
    number: int
    text: str
    expected_answer: str
    actual_answer: str | None
    objectives: list[ObjectiveSchema]


class QuestionCreateSchema(Schema):
    """The fields required to create a Question."""

    number: int
    text: str
    expected_answer: str
    objective_ids: list[UUID]


class QuestionUpdateSchema(Schema):
    """The fields that can be updated on a Question."""

    number: int | None = None
    text: str | None = None
    expected_answer: str | None = None
    actual_answer: str | None = None
    objective_ids: list[UUID] | None = None


class ExerciseSchema(Schema):
    """The fields of an Exercise."""

    id: UUID
    created_at: datetime
    participants: list[ParticipantSchema]
    references: list[ReferenceSchema]
    objectives: list[ObjectiveSchema]
    type: Exercise.Type
    start_date_time: datetime
    end_date_time: datetime
    title: str
    scenario: str
    red_team_coordinated_at: datetime | None
    read_aheads_sent_at: datetime | None
    status: Exercise.Status
    updated_at: datetime


class ExerciseCreateSchema(Schema):
    """The fields required to create an Exercise."""

    type: Exercise.Type
    start_date_time: datetime
    end_date_time: datetime
    title: str
    scenario: str


class ExerciseUpdateSchema(Schema):
    """The fields that can be updated on an Exercise."""

    reference_ids: list[UUID] | None = None
    objective_ids: list[UUID] | None = None
    type: Exercise.Type | None = None
    start_date_time: datetime | None = None
    end_date_time: datetime | None = None
    title: str | None = None
    scenario: str | None = None
    red_team_coordinated_at: datetime | None = None
    read_aheads_sent_at: datetime | None = None
    status: Exercise.Status | None = None
