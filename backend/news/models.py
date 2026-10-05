from django.conf import settings
from django.db import models

from core.models import TimeStampedModel


class Annonce(TimeStampedModel):
    """Annonce de plateforme affichée sur la page « Actualités » de
    l'apprenant, section « Annonces de la communauté » — gérée par un
    administrateur (RBAC : IsAdmin sur les vues d'écriture, voir views.py),
    contrairement aux « Nouveautés du catalogue » de la même page qui, elles,
    viennent automatiquement des formations publiées."""

    class Categorie(models.TextChoices):
        ANNONCE_PLATEFORME = "ANNONCE_PLATEFORME", "Annonce Plateforme"
        FONCTIONNALITE = "FONCTIONNALITE", "Fonctionnalité"
        EVENEMENT = "EVENEMENT", "Événement"
        AUTRE = "AUTRE", "Autre"

    titre = models.CharField(max_length=200)
    categorie = models.CharField(max_length=30, choices=Categorie.choices, default=Categorie.ANNONCE_PLATEFORME)
    contenu = models.TextField()
    # Libellé affiché ("Équipe Pédagogique", "Support Technique"...) plutôt
    # que le nom réel de l'administrateur qui a rédigé l'annonce — c'est une
    # communication au nom de la plateforme, pas un post personnel.
    auteur_label = models.CharField(max_length=100, default="Équipe Pédagogique")
    important = models.BooleanField(default=False)
    redacteur = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, related_name="annonces_redigees"
    )

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return self.titre
