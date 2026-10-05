from django.conf import settings
from django.db import models

from core.models import TimeStampedModel


class Carte(TimeStampedModel):
    """Carte interactive personnelle (outil Cartographie).

    `elements` stocke la liste des repères/tracés/mesures de la carte telle
    que produite par le frontend (Leaflet) : type (marqueur, polygone,
    ligne, mesure), coordonnées, style, libellé. Le backend ne l'interprète
    pas — même principe que `Scene3D.objets` pour la Modélisation 3D."""

    proprietaire = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="cartes"
    )
    nom = models.CharField(max_length=150)
    elements = models.JSONField(default=list, blank=True)
    # Centre/zoom de la vue sauvegardée, pour rouvrir la carte là où
    # l'apprenant l'avait laissée plutôt que de revenir à une vue par défaut.
    centre_lat = models.FloatField(default=48.8566)
    centre_lng = models.FloatField(default=2.3522)
    zoom = models.PositiveSmallIntegerField(default=5)

    class Meta:
        ordering = ["-updated_at"]

    def __str__(self):
        return f"{self.nom} ({self.proprietaire.email})"
