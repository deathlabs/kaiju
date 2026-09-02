# Standard library imports.
from datetime import datetime
from uuid import UUID

# Third party imports.
from ninja import Schema

# Local imports.
from observations.models import Observation


class BadRequestResponseSchema(Schema):
    """The fields returned when a request is invalid."""

    message: str


class NotFoundResponseSchema(Schema):
    """The fields returned when a resource is not found."""

    message: str


class ObservationSchema(Schema):
    """The fields of an Observation."""

    id: UUID
    created_at: datetime
    created_by_id: int
    updated_at: datetime
    type: Observation.Type
    text: str


class ObservationCreateSchema(Schema):
    """The fields required to create an Observation."""

    type: Observation.Type
    text: str


class ObservationUpdateSchema(Schema):
    """The fields that can be updated on an Observation."""

    type: Observation.Type | None = None
    text: str | None = None
