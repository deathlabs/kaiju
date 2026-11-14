# Standard library imports.
from enum import StrEnum
from functools import lru_cache
from pathlib import Path

# Third party imports.
from django.conf import settings
from django.contrib.auth import get_user_model
from jwt import PyJWKClient, decode
from jwt.exceptions import InvalidTokenError, PyJWKClientError
from ninja.security import HttpBearer


class AuthMode(StrEnum):
    LOCAL = "local"
    OIDC = "oidc"


@lru_cache
def _read_public_key(path: str) -> str:
    return Path(path).read_text(encoding="ascii")


@lru_cache
def _get_jwks_client(url: str) -> PyJWKClient:
    return PyJWKClient(url, cache_jwk_set=True, lifespan=300, timeout=5)


def _get_signing_key(token: str):
    mode = AuthMode(settings.AUTH_MODE)
    if mode is AuthMode.LOCAL:
        if not settings.OIDC_PUBLIC_KEY_PATH:
            raise RuntimeError("OIDC_PUBLIC_KEY_PATH is required in local mode")
        return _read_public_key(settings.OIDC_PUBLIC_KEY_PATH)

    return _get_jwks_client(settings.OIDC_JWKS_URL).get_signing_key_from_jwt(token).key


def authenticate_token(token: str):
    """Validate a bearer token and return its Django user."""
    signing_key = _get_signing_key(token)
    claims = decode(
        token,
        signing_key,
        algorithms=["RS256"],
        audience=settings.OIDC_AUDIENCE,
        issuer=settings.OIDC_ISSUER,
        options={"require": ["exp", "iat", "sub"]},
    )

    username = claims.get("preferred_username") or claims.get("email") or claims["sub"]
    user, _ = get_user_model().objects.update_or_create(
        username=username,
        defaults={
            "email": claims.get("email", ""),
            "first_name": claims.get("given_name", ""),
            "last_name": claims.get("family_name", ""),
        },
    )
    return user


class OIDCBearerAuthentication(HttpBearer):
    """Authenticate API requests with a validated OIDC bearer token."""

    def authenticate(self, request, token):
        try:
            user = authenticate_token(token)
        except (InvalidTokenError, OSError, PyJWKClientError, RuntimeError, ValueError):
            return None

        request.user = user
        return user
