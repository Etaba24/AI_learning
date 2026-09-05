from django.conf import settings
from django.db import models

from core.models import TimeStampedModel


class Conversation(TimeStampedModel):
    """Fil de discussion apprenant <-> formateur. Un seul fil par paire,
    même si l'apprenant est inscrit à plusieurs formations du même
    formateur — le droit d'y écrire dépend de l'inscription, vérifié à
    chaque appel (voir messaging.services.peut_chatter_avec), pas ici."""

    apprenant = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name="conversations_apprenant"
    )
    formateur = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name="conversations_formateur"
    )

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=["apprenant", "formateur"], name="unique_conversation_par_paire")
        ]

    def __str__(self):
        return f"{self.apprenant} <-> {self.formateur}"


class Message(TimeStampedModel):
    conversation = models.ForeignKey(Conversation, on_delete=models.CASCADE, related_name="messages")
    expediteur = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name="messages_envoyes"
    )
    contenu = models.TextField()
    lu = models.BooleanField(default=False)

    class Meta:
        ordering = ["created_at"]

    def __str__(self):
        return f"{self.expediteur} — {self.contenu[:40]}"
