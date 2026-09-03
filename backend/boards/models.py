from django.conf import settings
from django.db import models

from core.models import TimeStampedModel


class Tableau(TimeStampedModel):
    """Tableau blanc personnel d'un utilisateur (outil Tableau blanc).

    `scene` stocke la liste d'éléments Excalidraw (traits, formes, textes)
    telle que produite par le frontend. Le backend ne l'interprète pas."""

    proprietaire = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="tableaux"
    )
    nom = models.CharField(max_length=150)
    scene = models.JSONField(default=list, blank=True)

    class Meta:
        ordering = ["-updated_at"]

    def __str__(self):
        return f"{self.nom} ({self.proprietaire.email})"
