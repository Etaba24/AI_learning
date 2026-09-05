from django.conf import settings
from django.db import models

from core.models import TimeStampedModel


class Document(TimeStampedModel):
    """Support PDF/EPUB déposé par un formateur (ou l'admin) dans la
    bibliothèque, avec le même cycle de vie de modération qu'une formation
    (RG-001/RG-002 appliqués par analogie) : un contenu déposé par un
    formateur n'est visible des apprenants qu'une fois publié par un
    administrateur."""

    class Statut(models.TextChoices):
        BROUILLON = "BROUILLON", "Brouillon"
        SOUMIS = "SOUMIS", "Soumis"
        VALIDE = "VALIDE", "Validé"
        REFUSE = "REFUSE", "Refusé"
        PUBLIE = "PUBLIE", "Publié"
        DEPUBLIE = "DEPUBLIE", "Dépublié"

    class Format(models.TextChoices):
        PDF = "PDF", "PDF"
        EPUB = "EPUB", "EPUB"

    titre = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    categorie = models.ForeignKey(
        "trainings.Category", on_delete=models.PROTECT, related_name="documents"
    )
    format = models.CharField(max_length=10, choices=Format.choices)
    fichier = models.FileField(upload_to="bibliotheque/%Y/%m/")
    taille_octets = models.PositiveIntegerField(help_text="Taille réelle du fichier, calculée à l'upload")
    auteur = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name="documents"
    )
    statut = models.CharField(max_length=20, choices=Statut.choices, default=Statut.BROUILLON)
    motif_refus = models.TextField(blank=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return self.titre
