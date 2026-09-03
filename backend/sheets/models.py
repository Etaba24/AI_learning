from django.conf import settings
from django.db import models

from core.models import TimeStampedModel


class Classeur(TimeStampedModel):
    """Feuille de calcul personnelle d'un utilisateur (outil Tableur).

    `donnees` stocke la matrice de cellules telle que produite par le
    frontend (react-spreadsheet) : liste de lignes, chaque ligne étant une
    liste de cellules {"value": ...} ou null. Le backend ne l'interprète
    pas — il la restitue telle quelle, les formules sont évaluées côté
    client."""

    proprietaire = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="classeurs"
    )
    nom = models.CharField(max_length=150)
    donnees = models.JSONField(default=list, blank=True)

    class Meta:
        ordering = ["-updated_at"]

    def __str__(self):
        return f"{self.nom} ({self.proprietaire.email})"
