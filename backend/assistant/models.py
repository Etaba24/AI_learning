from django.conf import settings
from django.db import models

from core.models import TimeStampedModel
from trainings.models import Lecon


class ConversationIA(TimeStampedModel):
    """RF-038 : historique des échanges avec l'assistant IA. On garde
    lecon nullable (SET_NULL) : si la leçon est supprimée un jour,
    l'historique de conversation de l'apprenant reste consultable."""

    apprenant = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name="conversations_ia"
    )
    lecon = models.ForeignKey(
        Lecon, on_delete=models.SET_NULL, null=True, related_name="conversations_ia"
    )
    # Leçons supplémentaires de la MÊME formation incluses dans le contexte
    # envoyé au modèle pour cette question précise (ex: des leçons liées entre
    # elles pour une meilleure compréhension) — jamais d'une autre formation,
    # vérifié côté vue (AssistantAskView) avant tout appel au LLM.
    lecons_associees = models.ManyToManyField(Lecon, related_name="+", blank=True)
    question = models.TextField()
    reponse = models.TextField()

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.apprenant} — {self.question[:50]}"
