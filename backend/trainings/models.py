from django.conf import settings
from django.db import models

from core.models import TimeStampedModel


class Category(TimeStampedModel):
    """RF-018 : gérée par l'administrateur (créer/renommer/supprimer)."""

    nom = models.CharField(max_length=100, unique=True)
    description = models.TextField(blank=True)

    class Meta:
        verbose_name_plural = "categories"
        ordering = ["nom"]

    def __str__(self):
        return self.nom


class Formation(TimeStampedModel):
    """RF-008. Le cycle de vie du statut est encadré par RG-001 à RG-004 :
    seul un Administrateur fait passer une formation de Soumise à
    Validée/Refusée (RG-002), et elle ne peut être publiée que validée et
    contenant au moins un module avec une leçon (RG-003)."""

    class Niveau(models.TextChoices):
        DEBUTANT = "DEBUTANT", "Débutant"
        INTERMEDIAIRE = "INTERMEDIAIRE", "Intermédiaire"
        AVANCE = "AVANCE", "Avancé"

    class Statut(models.TextChoices):
        BROUILLON = "BROUILLON", "Brouillon"
        SOUMISE = "SOUMISE", "Soumise"
        VALIDEE = "VALIDEE", "Validée"
        REFUSEE = "REFUSEE", "Refusée"
        PUBLIEE = "PUBLIEE", "Publiée"
        DEPUBLIEE = "DEPUBLIEE", "Dépubliée"

    titre = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    objectifs = models.TextField(blank=True)
    prerequis = models.TextField(blank=True)
    niveau = models.CharField(max_length=20, choices=Niveau.choices, default=Niveau.DEBUTANT)
    duree_heures = models.PositiveIntegerField(help_text="Durée estimée, en heures")
    # Monétisation : False = accessible à tous, True = réservé aux abonnés
    # (contrôlé à l'inscription par billing.services — le « videur »).
    est_premium = models.BooleanField(default=False)
    categorie = models.ForeignKey(Category, on_delete=models.PROTECT, related_name="formations")
    # Obligatoire côté API (FormationSerializer), nullable en base pour ne
    # pas bloquer sur une migration interactive : un formateur ne peut
    # créer/publier que dans son propre département (un Admin, lui, choisit
    # librement, cf. RF-017).
    departement = models.ForeignKey(
        "core.Departement", on_delete=models.PROTECT, null=True, blank=True, related_name="formations"
    )
    auteur = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name="formations"
    )
    statut = models.CharField(max_length=20, choices=Statut.choices, default=Statut.BROUILLON)
    motif_refus = models.TextField(blank=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return self.titre


class Module(TimeStampedModel):
    formation = models.ForeignKey(Formation, on_delete=models.CASCADE, related_name="modules")
    titre = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    ordre = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ["ordre"]

    def __str__(self):
        return f"{self.formation.titre} — {self.titre}"


class Lecon(TimeStampedModel):
    module = models.ForeignKey(Module, on_delete=models.CASCADE, related_name="lecons")
    titre = models.CharField(max_length=200)
    contenu = models.TextField(blank=True)
    video_url = models.CharField(max_length=500, blank=True)
    ordre = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ["ordre"]

    def __str__(self):
        return f"{self.module.titre} — {self.titre}"


class Ressource(TimeStampedModel):
    """Fichier associé à une leçon (RF-010). Comme pour l'avatar (accounts),
    on stocke une URL vers un fichier déposé sur l'espace de stockage objet
    (S3/MinIO) plutôt que de gérer l'upload nous-mêmes à ce stade."""

    class Type(models.TextChoices):
        PDF = "PDF", "PDF"
        IMAGE = "IMAGE", "Image"
        DOCUMENT = "DOCUMENT", "Document"
        AUTRE = "AUTRE", "Autre"

    lecon = models.ForeignKey(Lecon, on_delete=models.CASCADE, related_name="ressources")
    nom = models.CharField(max_length=200)
    type = models.CharField(max_length=20, choices=Type.choices, default=Type.AUTRE)
    url = models.CharField(max_length=500, blank=True)

    def __str__(self):
        return self.nom
