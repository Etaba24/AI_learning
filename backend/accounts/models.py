import uuid

from django.contrib.auth.models import AbstractUser
from django.db import models

from .managers import UserManager


class User(AbstractUser):
    """Compte commun aux 3 rôles (RF-001 à RF-007). On repart de
    AbstractUser (fourni par Django : gère déjà mot de passe hashé,
    is_active, is_staff, permissions...) et on l'adapte : email comme
    identifiant de connexion à la place du username, + un rôle.

    id en UUID plutôt qu'entier auto-incrémenté (n'hérite pas de
    TimeStampedModel comme les autres apps, donc redéclaré ici) : évite de
    pouvoir énumérer les comptes via /api/users/<id>/."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    class Role(models.TextChoices):
        STUDENT = "STUDENT", "Apprenant"
        INSTRUCTOR = "INSTRUCTOR", "Formateur"
        ADMIN = "ADMIN", "Administrateur"

    username = None  # on ne s'en sert pas, l'email suffit
    email = models.EmailField(unique=True)
    role = models.CharField(max_length=20, choices=Role.choices, default=Role.STUDENT)

    # Obligatoire pour un Formateur (validé dans les serializers, pas ici :
    # nullable au niveau modèle puisque Apprenant/Admin n'en ont pas besoin).
    departement = models.ForeignKey(
        "core.Departement", on_delete=models.PROTECT, null=True, blank=True, related_name="formateurs"
    )

    # RF-007 : profil consultable/modifiable
    bio = models.TextField(blank=True)
    # URL vers un fichier stocké sur l'espace objet (S3/MinIO, cf. section 12) :
    # pas d'upload direct géré par Django pour l'instant.
    avatar_url = models.URLField(blank=True)

    USERNAME_FIELD = "email"
    REQUIRED_FIELDS = []  # champs en plus de USERNAME_FIELD et password demandés par createsuperuser

    objects = UserManager()

    def __str__(self):
        return f"{self.email} ({self.role})"
