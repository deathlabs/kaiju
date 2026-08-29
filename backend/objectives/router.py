# Standard library imports.
from uuid import UUID

# Third party imports.
from ninja import Router, Status

# Local imports.
from objectives.models import Objective
from objectives.schemas import (
    NotFoundResponseSchema,
    ObjectiveCreateSchema,
    ObjectiveSchema,
    ObjectiveUpdateSchema,
)

# Init the references router.
router = Router(tags=["objectives"])


@router.post(
    "/",
    response={201: ObjectiveSchema},
)
def create_objective(request, payload: ObjectiveCreateSchema):
    """Create an objective."""
    objective = Objective.objects.create(**payload.model_dump())
    return Status(201, objective)


@router.get("/", response={200: list[ObjectiveSchema]})
def list_objectives(request):
    """Fetch all objectives."""
    return Status(200, Objective.objects.all())


@router.get(
    "/{objective_id}/",
    response={
        200: ObjectiveSchema,
        404: NotFoundResponseSchema,
    },
)
def get_objective(request, objective_id: UUID):
    """Fetch an objective by its ID."""
    try:
        return Status(200, Objective.objects.get(id=objective_id))
    except Objective.DoesNotExist:
        return Status(404, {"message": "Objective not found"})


@router.patch(
    "/{objective_id}/",
    response={
        200: ObjectiveSchema,
        404: NotFoundResponseSchema,
    },
)
def update_objective(request, objective_id: UUID, payload: ObjectiveUpdateSchema):
    """Update an objective."""
    try:
        objective = Objective.objects.get(id=objective_id)
    except Objective.DoesNotExist:
        return Status(404, {"message": "Objective not found"})

    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(objective, field, value)

    objective.save()
    return Status(200, objective)


@router.delete(
    "/{objective_id}/",
    response={
        204: None,
        404: NotFoundResponseSchema,
    },
)
def delete_objective(request, objective_id: UUID):
    """Delete an objective."""
    try:
        objective = Objective.objects.get(id=objective_id)
    except Objective.DoesNotExist:
        return Status(404, {"message": "Objective not found"})

    objective.delete()
    return Status(204, None)
