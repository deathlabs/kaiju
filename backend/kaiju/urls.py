# Standard library imports.
from django.contrib import admin
from django.urls import path

# Local imports.
from exercises.router import router as exercises_router
from ninja import NinjaAPI
from objectives.router import router as objectives_router
from references.router import router as references_router

from .health import api as health_api

api = NinjaAPI()
api.add_router("/health/", health_api)
api.add_router("/exercises/", exercises_router)
api.add_router("/objectives/", objectives_router)
api.add_router("/references/", references_router)

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/v1/", api.urls),
]
