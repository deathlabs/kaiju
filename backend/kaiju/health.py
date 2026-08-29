# Third party imports.
from ninja import Router

api = Router(tags=["health"])


@api.get("/")
def health(request):
    return {"status": "ok"}
