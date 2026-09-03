import uuid

from django.conf import settings
from django.db import models


class TimeStampedModel(models.Model):
    """Modèle abstrait : pas de table 'core_timestampedmodel' créée.
    Les autres modèles font `class Formation(TimeStampedModel):` pour
    hériter de ces champs sans les réécrire à chaque fois.

    id en UUID plutôt qu'un entier auto-incrémenté : un entier (1, 2, 3...)
    est devinable/énumérable depuis l'API (essayer /api/formations/1/, /2/...
    révèle aussi le nombre d'enregistrements) ; un UUID ne l'est pas."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        abstract = True


class Departement(TimeStampedModel):
    """Rattaché à la fois aux formateurs (accounts.User) et aux formations
    (trainings.Formation) : vit dans core plutôt que dans l'une des deux
    apps, pour éviter que l'une dépende de l'autre."""

    nom = models.CharField(max_length=100, unique=True)
    description = models.TextField(blank=True)

    class Meta:
        ordering = ["nom"]

    def __str__(self):
        return self.nom


class JournalActivite(TimeStampedModel):
    """Traçabilité des actions sensibles (RNF-007) : connexions,
    changements de rôle, validation/refus de formation, etc.
    `created_at` (hérité) sert de date de l'action."""

    utilisateur = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name="journal_entries",
    )
    action = models.CharField(max_length=100)
    detail = models.TextField(blank=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.action} — {self.utilisateur} — {self.created_at:%Y-%m-%d %H:%M}"
