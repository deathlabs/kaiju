# Third party imports.
from django.contrib import admin
from django.urls import path

# Local imports.
from exercises.api import api as exercises_api

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/v1/exercises/", exercises_api.urls),
]
