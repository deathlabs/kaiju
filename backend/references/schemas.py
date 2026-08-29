# Standard library imports.
from datetime import datetime
from uuid import UUID

# Third party imports.
from ninja import Schema


class ReferenceCreateSchema(Schema):
    """The information required to create an reference."""

    title: str
    url: str


class ReferenceUpdateSchema(Schema):
    """The fields that can be updated on a reference."""

    title: str | None = None
    url: str | None = None


class ReferenceSchema(Schema):
    """The information returned by the API for a reference."""

    id: UUID
    title: str
    url: str
    created_at: datetime
    updated_at: datetime


class NotFoundSchema(Schema):
    """The information returned when a resource is not found."""

    message: str
