from django.conf import settings
from django.db import models

from core.models import TimeStampedModel


class Note(TimeStampedModel):
    """Note personnelle d'un utilisateur (outil Prise de notes).

    `lecon` est optionnelle : une note peut être libre, ou rattachée à une
    leçon pour être retrouvée depuis la formation. SET_NULL : si la leçon
    est supprimée du catalogue, la note de l'apprenant survit."""

    proprietaire = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="notes"
    )
    titre = models.CharField(max_length=200)
    contenu = models.TextField(blank=True)
    lecon = models.ForeignKey(
        "trainings.Lecon", on_delete=models.SET_NULL, null=True, blank=True, related_name="notes"
    )

    class Meta:
        ordering = ["-updated_at"]

    def __str__(self):
        return f"{self.titre} ({self.proprietaire.email})"
