# Third party imports
from django.contrib import admin
from django.urls import path

# Local imports.
from exercises.api import api as exercises_api
from .health import api as health_api
from references.api import api as references_api

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/v1/exercises/", exercises_api.urls),
    path("api/v1/health/", health_api.urls),
    path("api/v1/references/", references_api.urls),
]
