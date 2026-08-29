# Standard library imports.
from uuid import UUID

# Third party imports.
from ninja import Router, Status

# Local imports.
from references.models import Reference
from references.schemas import (
    NotFoundSchema,
    ReferenceCreateSchema,
    ReferenceSchema,
    ReferenceUpdateSchema,
)

# Init the references router.
router = Router(tags=["references"])


@router.get("/", response=list[ReferenceSchema])
def list_references(request):
    """Return all references."""
    return Reference.objects.all()


@router.get("/{reference_id}/", response={200: ReferenceSchema, 404: NotFoundSchema})
def get_reference(request, reference_id: UUID):
    """Return a reference by its ID."""
    try:
        return Reference.objects.get(id=reference_id)
    except Reference.DoesNotExist:
        return Status(404, {"message": "Reference not found"})


@router.post(
    "/", response={201: ReferenceSchema, 400: NotFoundSchema, 404: NotFoundSchema}
)
def create_reference(request, payload: ReferenceCreateSchema):
    """Create a reference."""
    reference = Reference.objects.create(**payload.model_dump())
    return Status(201, reference)


@router.patch("/{reference_id}/", response={200: ReferenceSchema, 404: NotFoundSchema})
def update_reference(request, reference_id: UUID, payload: ReferenceUpdateSchema):
    """Update a reference."""
    try:
        reference = Reference.objects.get(id=reference_id)
    except Reference.DoesNotExist:
        return Status(404, {"message": "Reference not found"})

    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(reference, field, value)
    reference.save()
    return reference
