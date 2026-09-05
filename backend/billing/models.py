import secrets
import string

from django.conf import settings
from django.db import models
from django.utils import timezone

from core.models import TimeStampedModel


def generer_code_invitation():
    """Code court lisible (ex: X7K2-M9QD) qu'un établissement partage à ses
    membres. secrets (et non random) : imprévisible, non devinable."""
    alphabet = string.ascii_uppercase + string.digits
    brut = "".join(secrets.choice(alphabet) for _ in range(8))
    return f"{brut[:4]}-{brut[4:]}"


class Etablissement(TimeStampedModel):
    """Client B2B (lycée, université, entreprise). Ses membres sont les
    Users portant etablissement=<lui> ; ils bénéficient de son abonnement."""

    nom = models.CharField(max_length=200, unique=True)
    code_invitation = models.CharField(
        max_length=12, unique=True, default=generer_code_invitation, editable=False
    )
    actif = models.BooleanField(default=True)

    class Meta:
        ordering = ["nom"]

    def __str__(self):
        return self.nom


class ResponsableInvitationCode(TimeStampedModel):
    """Code à usage unique remis à la personne responsable d'un
    établissement une fois son abonnement premium confirmé — le rédemer
    crée son compte ETABLISSEMENT_ADMIN. OneToOne : un seul code "actif" par
    établissement (le régénérer invalide l'ancien, pas d'accumulation).

    `utilise` empêche explicitement qu'il serve à créer un deuxième compte
    responsable pour le même établissement une fois rédemé une première
    fois — exactement la protection demandée."""

    etablissement = models.OneToOneField(
        Etablissement, on_delete=models.CASCADE, related_name="code_responsable"
    )
    code = models.CharField(max_length=12, unique=True, default=generer_code_invitation, editable=False)
    utilise = models.BooleanField(default=False)
    utilise_le = models.DateTimeField(null=True, blank=True)

    def __str__(self):
        return f"{self.code} — {self.etablissement.nom}"


class Filiere(TimeStampedModel):
    """Filière pédagogique propre à un établissement (ex: "Scientifique",
    "Littéraire") — regroupement optionnel de classes, pas obligatoire
    (un collège n'utilise souvent que des classes, sans filière)."""

    etablissement = models.ForeignKey(Etablissement, on_delete=models.CASCADE, related_name="filieres")
    nom = models.CharField(max_length=100)

    class Meta:
        ordering = ["nom"]
        constraints = [
            models.UniqueConstraint(fields=["etablissement", "nom"], name="filiere_unique_par_etablissement")
        ]

    def __str__(self):
        return f"{self.nom} — {self.etablissement.nom}"


class Classe(TimeStampedModel):
    """Classe propre à un établissement (ex: "Tle D", "1ère C4"), rattachée
    à une filière ou non. C'est elle que porte directement chaque élève
    (accounts.User.classe), pas la filière — la filière ne sert qu'à
    regrouper des classes pour la navigation à grande échelle."""

    etablissement = models.ForeignKey(Etablissement, on_delete=models.CASCADE, related_name="classes")
    filiere = models.ForeignKey(
        Filiere, on_delete=models.SET_NULL, null=True, blank=True, related_name="classes"
    )
    nom = models.CharField(max_length=100)

    class Meta:
        ordering = ["nom"]
        constraints = [
            models.UniqueConstraint(fields=["etablissement", "nom"], name="classe_unique_par_etablissement")
        ]

    def __str__(self):
        return f"{self.nom} — {self.etablissement.nom}"


class Plan(TimeStampedModel):
    """Formule d'abonnement (ex: Premium individuel, Pack Établissement)."""

    class TypePlan(models.TextChoices):
        INDIVIDUEL = "INDIVIDUEL", "Individuel"
        ETABLISSEMENT = "ETABLISSEMENT", "Établissement"

    nom = models.CharField(max_length=100, unique=True)
    type = models.CharField(max_length=20, choices=TypePlan.choices)
    prix_mensuel = models.DecimalField(max_digits=10, decimal_places=2)
    description = models.TextField(blank=True)
    # Liste de textes affichés avec des coches sur la page Abonnement
    # (ex: ["Accès à tous les outils", "Formations premium illimitées"]).
    avantages = models.JSONField(default=list, blank=True)
    # Durée d'accès accordée à la souscription, en mois.
    duree_mois = models.PositiveIntegerField(default=1)
    # Limite de places pour un plan établissement ; null = illimité.
    max_membres = models.PositiveIntegerField(null=True, blank=True)
    actif = models.BooleanField(default=True)

    class Meta:
        ordering = ["prix_mensuel"]

    def __str__(self):
        return f"{self.nom} ({self.get_type_display()})"


class Abonnement(TimeStampedModel):
    """Souscription à un Plan par UN user (B2C) ou UN établissement (B2B) —
    jamais les deux, jamais aucun (contrainte en base).

    on_delete=PROTECT sur plan : on ne supprime pas une formule à laquelle
    des abonnements sont rattachés (l'historique de facturation en dépend)."""

    class Statut(models.TextChoices):
        ACTIF = "ACTIF", "Actif"
        EXPIRE = "EXPIRE", "Expiré"
        ANNULE = "ANNULE", "Annulé"

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name="abonnements",
    )
    etablissement = models.ForeignKey(
        Etablissement, on_delete=models.CASCADE, null=True, blank=True, related_name="abonnements"
    )
    plan = models.ForeignKey(Plan, on_delete=models.PROTECT, related_name="abonnements")
    date_debut = models.DateField()
    date_fin = models.DateField()
    statut = models.CharField(max_length=10, choices=Statut.choices, default=Statut.ACTIF)

    class Meta:
        ordering = ["-date_fin"]
        constraints = [
            models.CheckConstraint(
                condition=(
                    models.Q(user__isnull=False, etablissement__isnull=True)
                    | models.Q(user__isnull=True, etablissement__isnull=False)
                ),
                name="abonnement_un_seul_souscripteur",
            )
        ]

    @property
    def est_actif(self):
        """Le statut seul ne suffit pas : un abonnement ACTIF dont la date
        est passée n'ouvre plus de droits (le statut sera régularisé plus
        tard, mais l'accès est coupé immédiatement)."""
        return self.statut == self.Statut.ACTIF and self.date_fin >= timezone.now().date()

    def __str__(self):
        titulaire = self.user.email if self.user else self.etablissement.nom
        return f"{titulaire} — {self.plan.nom} (jusqu'au {self.date_fin})"
