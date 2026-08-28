# Standard library imports.
from datetime import datetime
from uuid import UUID

# Third party imports.
from ninja import Schema


class ExerciseCreateSchema(Schema):
    """Define the information required to create an exercise."""

    title: str
    scenario: str
    type: str
    start_date_time: datetime
    end_date_time: datetime


class ExerciseSchema(Schema):
    """Represent an exercise returned by the API."""

    id: UUID
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


class ExerciseUpdateSchema(Schema):
    """Define the fields that can be updated on an exercise."""

    title: str | None = None
    scenario: str | None = None
    type: str | None = None
    status: str | None = None
    start_date_time: datetime | None = None
    end_date_time: datetime | None = None
    red_team_coordinated_at: datetime | None = None
    read_aheads_sent_at: datetime | None = None


class NotFoundSchema(Schema):
    """Represent a resource-not-found response."""

    message: str
