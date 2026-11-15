# Standard library imports.
from uuid import uuid4

# Third party imports.
from django.db import models


class Reference(models.Model):
    class Type(models.TextChoices):
        POLICY = "policy", "Policy"
        STANDARD = "standard", "Standard"
        PROCEDURE = "procedure", "Procedure"
        GUIDELINE = "guideline", "Guideline"

    id = models.UUIDField(primary_key=True, default=uuid4, editable=False)
    type = models.CharField(max_length=20, choices=Type.choices)
    title = models.CharField(max_length=200)
    url = models.URLField()
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self) -> str:
        return self.title
