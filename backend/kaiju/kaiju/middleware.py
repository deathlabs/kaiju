# Standard library imports
import jwt
from django.contrib.auth import get_user_model

User = get_user_model()


class UDSUserMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        authorization = request.headers.get("Authorization", "")

        if authorization.startswith("Bearer "):
            token = authorization.removeprefix("Bearer ")

            claims = jwt.decode(
                token,
                options={"verify_signature": False},
            )

            user, _ = User.objects.update_or_create(
                username=claims["preferred_username"],
                defaults={
                    "email": claims.get("email", ""),
                    "first_name": claims.get("given_name", ""),
                    "last_name": claims.get("family_name", ""),
                },
            )

            request.user = user

        return self.get_response(request)
