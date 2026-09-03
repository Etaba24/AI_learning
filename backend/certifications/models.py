import uuid

from django.conf import settings
from django.db import models

from core.models import TimeStampedModel
from trainings.models import Formation


class Certification(TimeStampedModel):
    """RG-007 : générée quand 100% des modules obligatoires + l'évaluation
    finale sont réussis (cette logique métier sera codée plus tard, dans la
    vue qui déclenche la création). RG-008 : immuable, avec un identifiant
    public unique vérifiable par un tiers non connecté (identifiant_public).
    `created_at` (hérité) sert de date d'obtention."""

    apprenant = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name="certifications"
    )
    formation = models.ForeignKey(Formation, on_delete=models.PROTECT, related_name="certifications")
    identifiant_public = models.UUIDField(default=uuid.uuid4, unique=True, editable=False)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["apprenant", "formation"], name="unique_certification_par_formation"
            )
        ]

    def save(self, *args, **kwargs):
        if self.pk is not None:
            raise ValueError(
                "Une certification est immuable (RG-008) : elle ne peut pas être modifiée après création."
            )
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.apprenant} — {self.formation} — {self.identifiant_public}"
