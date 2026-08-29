# Standard library imports.
from datetime import datetime
from uuid import UUID

# Third party imports.
from ninja import Schema


class ExerciseCreateSchema(Schema):
    """The information required to create an exercise."""

    title: str
    scenario: str
    type: str
    start_date_time: datetime
    end_date_time: datetime


class ExerciseUpdateSchema(Schema):
    """The fields that can be updated on an exercise."""

    title: str | None = None
    scenario: str | None = None
    type: str | None = None
    status: str | None = None
    start_date_time: datetime | None = None
    end_date_time: datetime | None = None
    red_team_coordinated_at: datetime | None = None
    read_aheads_sent_at: datetime | None = None


class ExerciseSchema(Schema):
    """The information returned by the API for an exercise."""

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


class NotFoundSchema(Schema):
    """The information returned when a resource is not found."""

    message: str
