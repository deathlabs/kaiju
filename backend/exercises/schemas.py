# Standard library imports.
from datetime import datetime
from uuid import UUID

# Third party imports.
from ninja import Schema
from objectives.schemas import ObjectiveSchema
from pydantic import EmailStr
from references.schemas import ReferenceSchema


class BadRequestResponseSchema(Schema):
    """The fields returned when a request is invalid."""

    message: str


class ExerciseCreateSchema(Schema):
    """The fields required to create an Exercise."""

    title: str
    scenario: str
    type: str
    start_date_time: datetime
    end_date_time: datetime


class ExerciseUpdateSchema(Schema):
    """The fields that can be updated on an Exercise."""

    reference_ids: list[UUID] | None = None
    objective_ids: list[UUID] | None = None
    title: str | None = None
    scenario: str | None = None
    type: str | None = None
    status: str | None = None
    start_date_time: datetime | None = None
    end_date_time: datetime | None = None
    red_team_coordinated_at: datetime | None = None
    read_aheads_sent_at: datetime | None = None


class ExerciseSchema(Schema):
    """The fields of an Exercise."""

    id: UUID
    references: list[ReferenceSchema]
    objectives: list[ObjectiveSchema]
    title: str
    scenario: str
    type: str
    status: str
    start_date_time: datetime
    end_date_time: datetime
    red_team_coordinated_at: datetime | None
    read_aheads_sent_at: datetime | None
    created_at: datetime
    updated_at: datetime


class NotFoundResponseSchema(Schema):
    """The fields returned when a resource is not found."""

    message: str


class ParticipantSchema(Schema):
    """The fields of a Participant."""

    id: UUID
    exercise_id: UUID
    first_name: str
    last_name: str
    email: EmailStr
    role: str


class ParticipantCreateSchema(Schema):
    """The fields required to create a Participant."""

    first_name: str
    last_name: str
    email: EmailStr
    role: str


class ParticipantUpdateSchema(Schema):
    """The fields that can be updated on a Participant."""

    first_name: str | None = None
    last_name: str | None = None
    email: EmailStr | None = None
    role: str | None = None
