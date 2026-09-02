# Standard library imports.
from uuid import UUID

# Third party imports.
from ninja import Router, Status

# Local imports.
from observations.models import Observation
from observations.schemas import (
    NotFoundResponseSchema,
    ObservationCreateSchema,
    ObservationSchema,
    ObservationUpdateSchema,
)

# Init the observations router.
observations_router = Router(tags=["observations"])


@observations_router.post(
    "/",
    response={201: ObservationSchema},
)
def create_observation(request, payload: ObservationCreateSchema):
    """Create an observation."""
    observation = Observation.objects.create(**payload.model_dump())
    return Status(201, observation)


@observations_router.get("/", response={200: list[ObservationSchema]})
def list_observations(request):
    """Fetch all observations."""
    return Status(200, Observation.objects.all())


@observations_router.get(
    "/{observation_id}/",
    response={
        200: ObservationSchema,
        404: NotFoundResponseSchema,
    },
)
def get_observation(request, observation_id: UUID):
    """Fetch an observation by its ID."""
    try:
        return Status(200, Observation.objects.get(id=observation_id))
    except Observation.DoesNotExist:
        return Status(404, {"message": "Observation not found"})


@observations_router.patch(
    "/{observation_id}/",
    response={
        200: ObservationSchema,
        404: NotFoundResponseSchema,
    },
)
def update_observation(request, observation_id: UUID, payload: ObservationUpdateSchema):
    """Update an observation."""
    try:
        observation = Observation.objects.get(id=observation_id)
    except Observation.DoesNotExist:
        return Status(404, {"message": "Observation not found"})

    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(observation, field, value)

    observation.save()
    return Status(200, observation)


@observations_router.delete(
    "/{observation_id}/",
    response={
        204: None,
        404: NotFoundResponseSchema,
    },
)
def delete_observation(request, observation_id: UUID):
    """Delete an observation."""
    try:
        observation = Observation.objects.get(id=observation_id)
    except Observation.DoesNotExist:
        return Status(404, {"message": "Observation not found"})

    observation.delete()
    return Status(204, None)
