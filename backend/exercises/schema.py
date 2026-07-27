# Standard library imports.
from datetime import datetime
from uuid import UUID

# Third party imports.
from ninja import Schema


class ExerciseCreateSchema(Schema):
    """Define the information required to create an exercise."""

    title: str
    scenario: str
    scheduled_start: datetime
    scheduled_end: datetime


class ExerciseSchema(Schema):
    """Represent an exercise returned by the API."""

    id: UUID
    title: str
    scenario: str
    status: str
    scheduled_start: datetime
    scheduled_end: datetime
    actual_start: datetime | None
    actual_end: datetime | None
    created_at: datetime
    updated_at: datetime


class NotFoundSchema(Schema):
    """Represent a resource-not-found response."""

    message: str
