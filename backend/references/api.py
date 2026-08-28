# Standard library imports.
from uuid import UUID

# Third party imports.
from ninja import NinjaAPI, Status

# Local imports.
from references.models import Reference
from references.schema import (
    NotFoundSchema,
    ReferenceCreateSchema,
    ReferenceSchema,
)

# Init the references API.
api = NinjaAPI(urls_namespace="references")


@api.get("/", response=list[ReferenceSchema])
def list_references(request):
    """Return all references."""
    return Reference.objects.all()


@api.get("/{reference_id}/", response={200: ReferenceSchema, 404: NotFoundSchema})
def get_reference(request, reference_id: UUID):
    """Return a reference by its ID."""
    try:
        return Reference.objects.get(id=reference_id)
    except Reference.DoesNotExist:
        return Status(404, {"message": "Reference not found"})


@api.post("/", response={201: ReferenceSchema})
def create_reference(request, payload: ReferenceCreateSchema):
    """Create a reference."""
    reference = Reference.objects.create(**payload.model_dump())
    return Status(201, reference)
