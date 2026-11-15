# Third party imports.
from django.contrib.auth import get_user_model
from ninja import Router, Schema, Status

# Local imports.
from exercises.models import Exercise
from objectives.models import Objective
from references.models import Reference


class CurrentUserSchema(Schema):
    """The fields of the current user."""

    username: str
    display_name: str
    email: str


class MetricsSchema(Schema):
    """The application record counts."""

    exercises: int
    objectives: int
    references: int
    users: int


identity_router = Router(tags=["identity"])


@identity_router.get(
    "/me",
    response={200: CurrentUserSchema},
)
def get_current_user(request):
    """Fetch the current user."""
    display_name = request.user.get_full_name() or request.user.get_username()
    return Status(
        200,
        {
            "username": request.user.get_username(),
            "display_name": display_name,
            "email": request.user.email,
        },
    )


@identity_router.get(
    "/metrics",
    response={200: MetricsSchema},
)
def get_metrics(request):
    """Fetch the application record counts."""
    return Status(
        200,
        {
            "exercises": Exercise.objects.count(),
            "objectives": Objective.objects.count(),
            "references": Reference.objects.count(),
            "users": get_user_model().objects.count(),
        },
    )
