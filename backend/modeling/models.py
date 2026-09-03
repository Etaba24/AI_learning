from django.conf import settings
from django.db import models

from core.models import TimeStampedModel


class Scene3D(TimeStampedModel):
    """Scène de modélisation 3D personnelle (outil Modélisation 3D).

    `objets` stocke la liste des objets de la scène telle que produite par
    le frontend (three.js) : type de primitive, position, rotation,
    échelle, couleur. Le backend ne l'interprète pas."""

    proprietaire = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="scenes3d"
    )
    nom = models.CharField(max_length=150)
    objets = models.JSONField(default=list, blank=True)

    class Meta:
        ordering = ["-updated_at"]

    def __str__(self):
        return f"{self.nom} ({self.proprietaire.email})"
