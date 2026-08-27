# Standard library imports.
from uuid import uuid4

# Third party imports.
from django.conf import settings
from django.db import models


class Reference(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid4, editable=False)
    title = models.CharField(max_length=200)
    url = models.URLField()

    def __str__(self) -> str:
        return self.title
