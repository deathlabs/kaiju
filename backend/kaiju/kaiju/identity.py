# Third party imports.
from ninja import Router, Schema, Status


class CurrentUserSchema(Schema):
    """The fields of the current user."""

    username: str
    display_name: str
    email: str


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
