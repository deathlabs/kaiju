# Standard library imports.
from uuid import UUID

# Third party imports.
from ninja import Router, Status

# Local imports.
from references.models import Reference
from references.schemas import (
    NotFoundResponseSchema,
    ReferenceCreateSchema,
    ReferenceSchema,
    ReferenceUpdateSchema,
)

# Init the references router.
router = Router(tags=["references"])


@router.post(
    "/",
    response={201: ReferenceSchema},
)
def create_reference(request, payload: ReferenceCreateSchema):
    """Create a reference."""
    reference = Reference.objects.create(**payload.model_dump())
    return Status(201, reference)


@router.get("/", response={200: list[ReferenceSchema]})
def list_references(request):
    """Fetch all references."""
    return Status(200, Reference.objects.all())


@router.get(
    "/{reference_id}/",
    response={
        200: ReferenceSchema,
        404: NotFoundResponseSchema,
    },
)
def get_reference(request, reference_id: UUID):
    """Fetch a reference by its ID."""
    try:
        return Status(200, Reference.objects.get(id=reference_id))
    except Reference.DoesNotExist:
        return Status(404, {"message": "Reference not found"})


@router.patch(
    "/{reference_id}/",
    response={
        200: ReferenceSchema,
        404: NotFoundResponseSchema,
    },
)
def update_reference(request, reference_id: UUID, payload: ReferenceUpdateSchema):
    """Update a reference."""
    try:
        reference = Reference.objects.get(id=reference_id)
    except Reference.DoesNotExist:
        return Status(404, {"message": "Reference not found"})

    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(reference, field, value)

    reference.save()
    return Status(200, reference)


@router.delete(
    "/{reference_id}/",
    response={
        204: None,
        404: NotFoundResponseSchema,
    },
)
def delete_reference(request, reference_id: UUID):
    """Delete a reference."""
    try:
        reference = Reference.objects.get(id=reference_id)
    except Reference.DoesNotExist:
        return Status(404, {"message": "Reference not found"})

    reference.delete()
    return Status(204, None)
