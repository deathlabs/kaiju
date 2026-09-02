# Standard library imports.
from uuid import uuid4

# Third party imports.
from django.conf import settings
from django.db import models


class Observation(models.Model):
    class Type(models.TextChoices):
        SUSTAINMENT = "sustainment", "Sustainment"
        IMPROVEMENT = "improvement", "Improvement"

    id = models.UUIDField(primary_key=True, default=uuid4, editable=False)
    created_at = models.DateTimeField(auto_now_add=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        related_name="observations_created",
        on_delete=models.PROTECT,
    )
    updated_at = models.DateTimeField(auto_now=True)
    text = models.TextField(max_length=200)
    type = models.CharField(max_length=20, choices=Type.choices)

    def __str__(self) -> str:
        return self.text
