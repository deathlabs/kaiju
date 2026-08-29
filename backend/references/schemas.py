# Standard library imports.
from datetime import datetime
from uuid import UUID

# Third party imports.
from ninja import Schema


class BadRequestResponseSchema(Schema):
    """The fields returned when a request is invalid."""

    message: str


class ReferenceCreateSchema(Schema):
    """The fields required to create a Reference."""

    title: str
    url: str


class ReferenceUpdateSchema(Schema):
    """The fields that can be updated on a Reference."""

    title: str | None = None
    url: str | None = None


class ReferenceSchema(Schema):
    """The fields of a Reference."""

    id: UUID
    title: str
    url: str
    created_at: datetime
    updated_at: datetime


class NotFoundResponseSchema(Schema):
    """The fields returned when a resource is not found."""

    message: str
