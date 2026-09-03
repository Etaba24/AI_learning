from django.conf import settings
from django.db import models

from core.models import TimeStampedModel
from trainings.models import Formation, Lecon


class Inscription(TimeStampedModel):
    """Lien apprenant <-> formation (RF-022). RG-004 : on ne peut s'inscrire
    qu'à une formation « Publiée » — cette règle sera vérifiée dans la vue
    API, pas ici (le modèle ne connaît pas le contexte de la requête)."""

    class Statut(models.TextChoices):
        EN_COURS = "EN_COURS", "En cours"
        TERMINEE = "TERMINEE", "Terminée"
        ABANDONNEE = "ABANDONNEE", "Abandonnée"

    apprenant = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name="inscriptions"
    )
    formation = models.ForeignKey(Formation, on_delete=models.CASCADE, related_name="inscriptions")
    statut = models.CharField(max_length=20, choices=Statut.choices, default=Statut.EN_COURS)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["apprenant", "formation"], name="unique_inscription_par_formation"
            )
        ]

    def __str__(self):
        return f"{self.apprenant} → {self.formation}"


class Progression(TimeStampedModel):
    """Avancement d'un apprenant sur une leçon précise (RF-025).
    RG-005 : une leçon est « terminée » si la vidéo est vue à 90%+ et/ou le
    quiz associé est réussi -> d'où le champ video_progression_percent."""

    class Statut(models.TextChoices):
        NON_COMMENCEE = "NON_COMMENCEE", "Non commencée"
        EN_COURS = "EN_COURS", "En cours"
        TERMINEE = "TERMINEE", "Terminée"

    inscription = models.ForeignKey(
        Inscription, on_delete=models.CASCADE, related_name="progressions"
    )
    lecon = models.ForeignKey(Lecon, on_delete=models.CASCADE, related_name="progressions")
    statut = models.CharField(max_length=20, choices=Statut.choices, default=Statut.NON_COMMENCEE)
    video_progression_percent = models.PositiveIntegerField(default=0)
    score = models.FloatField(null=True, blank=True, help_text="Score au quiz de la leçon, si applicable")

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["inscription", "lecon"], name="unique_progression_par_lecon"
            )
        ]

    def __str__(self):
        return f"{self.inscription.apprenant} — {self.lecon} — {self.statut}"
