# Standard library imports.
from datetime import datetime
from uuid import UUID

# Third party imports.
from ninja import Schema

# Local imports.
from objectives.schemas import ObjectiveSchema
from pydantic import EmailStr
from references.schemas import ReferenceSchema


class BadRequestResponseSchema(Schema):
    """The fields returned when a request is invalid."""

    message: str


class ParticipantSchema(Schema):
    """The fields of a Participant."""

    id: UUID
    exercise_id: UUID
    first_name: str
    last_name: str
    email: EmailStr
    role: str


class ExerciseCreateSchema(Schema):
    """The fields required to create an Exercise."""

    type: str
    start_date_time: datetime
    end_date_time: datetime
    title: str
    scenario: str


class ExerciseUpdateSchema(Schema):
    """The fields that can be updated on an Exercise."""

    facilitator_ids: list[int] | None = None
    reference_ids: list[UUID] | None = None
    objective_ids: list[UUID] | None = None
    type: str | None = None
    start_date_time: datetime | None = None
    end_date_time: datetime | None = None
    title: str | None = None
    scenario: str | None = None
    red_team_coordinated_at: datetime | None = None
    read_aheads_sent_at: datetime | None = None
    status: str | None = None


class ExerciseSchema(Schema):
    """The fields of an Exercise."""

    id: UUID
    created_at: datetime
    facilitator_ids: list[int]
    references: list[ReferenceSchema]
    objectives: list[ObjectiveSchema]
    type: str
    start_date_time: datetime
    end_date_time: datetime
    title: str
    scenario: str
    red_team_coordinated_at: datetime | None
    read_aheads_sent_at: datetime | None
    status: str
    updated_at: datetime

    @staticmethod
    def resolve_facilitator_ids(obj):
        return list(obj.facilitators.values_list("id", flat=True))


class NotFoundResponseSchema(Schema):
    """The fields returned when a resource is not found."""

    message: str


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
