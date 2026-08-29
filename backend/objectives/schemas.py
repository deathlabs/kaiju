# Standard library imports.
from datetime import datetime
from uuid import UUID

# Third party imports.
from ninja import Schema


class BadRequestResponseSchema(Schema):
    """The fields returned when a request is invalid."""

    message: str


class ObjectiveCreateSchema(Schema):
    """The fields required to create an Objective."""

    title: str
    description: str


class ObjectiveUpdateSchema(Schema):
    """The fields that can be updated on an Objective."""

    title: str | None = None
    description: str | None = None


class ObjectiveSchema(Schema):
    """The fields of an Objective."""

    id: UUID
    title: str
    description: str
    created_at: datetime
    updated_at: datetime


class NotFoundResponseSchema(Schema):
    """The fields returned when a resource is not found."""

    message: str
