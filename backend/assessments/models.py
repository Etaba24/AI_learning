from django.core.exceptions import ValidationError
from django.db import models

from core.models import TimeStampedModel
from trainings.models import Lecon, Module


class Quiz(TimeStampedModel):
    """RF-011 : rattaché à une leçon OU à un module, jamais les deux, jamais
    aucun des deux — d'où la méthode clean() ci-dessous. RG-006 : seuil de
    réussite en % (70 par défaut)."""

    lecon = models.ForeignKey(
        Lecon, on_delete=models.CASCADE, related_name="quiz", null=True, blank=True
    )
    module = models.ForeignKey(
        Module, on_delete=models.CASCADE, related_name="quiz", null=True, blank=True
    )
    titre = models.CharField(max_length=200)
    seuil_reussite = models.PositiveIntegerField(
        default=70, help_text="Score minimum en % pour réussir le quiz (RG-006)"
    )

    def clean(self):
        if bool(self.lecon_id) == bool(self.module_id):
            raise ValidationError(
                "Un quiz doit être rattaché à exactement une leçon OU un module."
            )

    def __str__(self):
        return self.titre


class Question(TimeStampedModel):
    quiz = models.ForeignKey(Quiz, on_delete=models.CASCADE, related_name="questions")
    enonce = models.TextField()
    ordre = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ["ordre"]

    def __str__(self):
        return self.enonce[:50]


class Choice(TimeStampedModel):
    """La 'Réponse' du modèle conceptuel (section 13) : une option proposée
    pour une question, avec un indicateur si elle est la bonne."""

    question = models.ForeignKey(Question, on_delete=models.CASCADE, related_name="choix")
    texte = models.CharField(max_length=300)
    est_correcte = models.BooleanField(default=False)

    def __str__(self):
        return self.texte


class Exercice(TimeStampedModel):
    """RF-012 : mise en pratique rattachée à une leçon, avec sa correction."""

    lecon = models.ForeignKey(Lecon, on_delete=models.CASCADE, related_name="exercices")
    enonce = models.TextField()
    correction = models.TextField()

    def __str__(self):
        return self.enonce[:50]
