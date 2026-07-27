# Third party imports
from django.contrib import admin
from django.urls import path

# Local imports.
from exercises.api import api as exercises_api
# from msels.api import api as msels_api
# from observations.api import api as observations_api
# from participants.api import api as participants_api
# from reports.api import api as reports_api

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/v1/exercises/", exercises_api.urls),
    # path("api/v1/msels/", msels_api.urls),
    # path("api/v1/observations/", observations_api.urls),
    # path("api/v1/participants/", participants_api.urls),
    # path("api/v1/reports/", reports_api.urls),
]
