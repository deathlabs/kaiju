# Standard library imports.
from datetime import datetime
from uuid import UUID

# Third party imports.
from ninja import Schema
from objectives.schemas import ObjectiveSchema
from pydantic import EmailStr
from references.schemas import ReferenceSchema

# Local imports.
from exercises.models import Exercise, Participant


class BadRequestResponseSchema(Schema):
    """The fields returned when a request is invalid."""

    message: str


class ParticipantSchema(Schema):
    """The fields of a Participant."""

    id: UUID
    first_name: str
    last_name: str
    email: EmailStr | None = None
    role: Participant.Role


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

    @staticmethod
    def resolve_participants(obj):
        return list(obj.participants.all())


class NotFoundResponseSchema(Schema):
    """The fields returned when a resource is not found."""

    message: str


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
