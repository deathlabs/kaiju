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


class ObjectiveExerciseSchema(Schema):
    """The exercise fields displayed for an objective relationship."""

    id: UUID
    title: str


class ObjectiveSchema(Schema):
    """The fields of an Objective."""

    id: UUID
    exercise_count: int = 0
    title: str
    description: str
    created_at: datetime
    updated_at: datetime


class ObjectiveDetailSchema(ObjectiveSchema):
    """The fields of an Objective and its related exercises."""

    exercises: list[ObjectiveExerciseSchema]


class NotFoundResponseSchema(Schema):
    """The fields returned when a resource is not found."""

    message: str
