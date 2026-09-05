import uuid

from django.contrib.auth.models import AbstractUser
from django.db import models

from core.models import TimeStampedModel

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
        # Responsable côté établissement client (B2B) : gère ses propres
        # formateurs/apprenants (ceux qui ont son .etablissement), jamais
        # ceux d'un autre établissement ni la plateforme dans son ensemble.
        ETABLISSEMENT_ADMIN = "ETABLISSEMENT_ADMIN", "Administrateur établissement"

    username = None  # on ne s'en sert pas, l'email suffit
    email = models.EmailField(unique=True)
    role = models.CharField(max_length=20, choices=Role.choices, default=Role.STUDENT)

    # Obligatoire pour un Formateur (validé dans les serializers, pas ici :
    # nullable au niveau modèle puisque Apprenant/Admin n'en ont pas besoin).
    departement = models.ForeignKey(
        "core.Departement", on_delete=models.PROTECT, null=True, blank=True, related_name="formateurs"
    )

    # B2B : membre d'un établissement client (rattaché via code d'invitation
    # à l'inscription). PROTECT : on ne supprime pas un établissement qui a
    # encore des membres. Null pour tout utilisateur grand public.
    etablissement = models.ForeignKey(
        "billing.Etablissement", on_delete=models.PROTECT, null=True, blank=True, related_name="membres"
    )

    # Classe de l'apprenant au sein de son établissement (ex: "Tle D") —
    # permet à l'admin établissement de filtrer/gérer à grande échelle
    # (1000+ élèves). SET_NULL : supprimer une classe ne supprime jamais un
    # compte, l'élève redevient juste "sans classe assignée".
    classe = models.ForeignKey(
        "billing.Classe", on_delete=models.SET_NULL, null=True, blank=True, related_name="eleves"
    )

    # Connexion Google (RF : "se connecter avec Google"). Identifiant unique
    # côté Google ("sub" du jeton), jamais réutilisé -> plus fiable que
    # l'email seul pour rattacher un compte. Null pour tout compte créé par
    # mot de passe classique et jamais lié à Google depuis.
    google_id = models.CharField(max_length=255, unique=True, null=True, blank=True)

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

    def anonymiser(self):
        """Suppression de compte demandée par l'utilisateur lui-même : un
        vrai DELETE échouerait presque toujours (PROTECT sur les
        inscriptions, messages, formations publiées...) et casserait
        l'historique d'autrui (formateur d'une formation encore suivie par
        d'autres, autre partie d'une conversation). On anonymise donc les
        données personnelles et on désactive le compte — is_active=False
        coupe l'accès dès la prochaine requête (vérifié par SimpleJWT)."""
        self.email = f"compte-supprime-{self.id}@ai-learning.local"
        self.first_name = ""
        self.last_name = ""
        self.bio = ""
        self.avatar_url = ""
        self.google_id = None
        self.is_active = False
        self.set_unusable_password()
        self.save()


class GoogleVerificationCode(TimeStampedModel):
    """Inscription via Google, étape intermédiaire : le compte n'est créé
    qu'après saisie du code à 4 chiffres envoyé par email — Google prouve
    déjà l'identité, ce code prouve en plus l'accès à la boîte mail utilisée
    sur la plateforme (défense en profondeur demandée explicitement)."""

    google_id = models.CharField(max_length=255)
    email = models.EmailField()
    first_name = models.CharField(max_length=150, blank=True)
    last_name = models.CharField(max_length=150, blank=True)
    code = models.CharField(max_length=4)
    expires_at = models.DateTimeField()
    consumed = models.BooleanField(default=False)

    class Meta:
        ordering = ["-created_at"]
