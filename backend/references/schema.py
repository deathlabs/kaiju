# Standard library imports.
from datetime import datetime
from uuid import UUID

# Third party imports.
from ninja import Schema


class ReferenceCreateSchema(Schema):
    """Define the information required to create an reference."""

    title: str
    url: str


class ReferenceSchema(Schema):
    """Represent an reference returned by the API."""

    id: UUID
    title: str
    url: str
    created_at: datetime
    updated_at: datetime


class NotFoundSchema(Schema):
    """Represent a resource-not-found response."""

    message: str
