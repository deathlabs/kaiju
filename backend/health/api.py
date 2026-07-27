# Third party imports.
from ninja import NinjaAPI

api = NinjaAPI(urls_namespace="health")


@api.get("/")
def health(request):
    return {"status": "ok"}
