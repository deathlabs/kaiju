# Standard library imports.
from datetime import datetime
from uuid import UUID

# Third party imports.
from ninja import Schema
from pydantic import AnyHttpUrl

# Local imports.
from references.models import Reference


class BadRequestResponseSchema(Schema):
    """The fields returned when a request is invalid."""

    message: str


class ReferenceCreateSchema(Schema):
    """The fields required to create a Reference."""

    type: Reference.Type
    title: str
    url: AnyHttpUrl


class ReferenceUpdateSchema(Schema):
    """The fields that can be updated on a Reference."""

    type: Reference.Type | None = None
    title: str | None = None
    url: AnyHttpUrl | None = None


class ReferenceExerciseSchema(Schema):
    """The exercise fields displayed for a reference relationship."""

    id: UUID
    title: str


class ReferenceSchema(Schema):
    """The fields of a Reference."""

    id: UUID
    exercise_count: int = 0
    exercises: list[ReferenceExerciseSchema]
    type: Reference.Type
    title: str
    url: AnyHttpUrl
    created_at: datetime
    updated_at: datetime


class NotFoundResponseSchema(Schema):
    """The fields returned when a resource is not found."""

    message: str
