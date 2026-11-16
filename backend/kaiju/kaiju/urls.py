# Standard library imports.
from django.contrib import admin
from django.urls import path

# Local imports.
from exercises.router import exercises_router
from exercises.chat import stream
from ninja import NinjaAPI
from objectives.router import objectives_router
from references.router import references_router

from .auth import OIDCBearerAuthentication
from .health import api as health_api
from .identity import identity_router

api = NinjaAPI(auth=OIDCBearerAuthentication())
api.add_router("/health/", health_api)
api.add_router("/", identity_router)
api.add_router("/references/", references_router)
api.add_router("/objectives/", objectives_router)
api.add_router("/exercises/", exercises_router)

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/v1/exercises/<uuid:exercise_id>/chat/stream/", stream),
    path("api/v1/", api.urls),
]
