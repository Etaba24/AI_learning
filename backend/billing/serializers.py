from accounts.models import User
from rest_framework import serializers

from .models import Abonnement, Classe, Etablissement, Filiere, Plan, ResponsableInvitationCode


class ResponsableInvitationCodeSerializer(serializers.ModelSerializer):
    """Vue admin plateforme du code — jamais exposée aux établissements
    eux-mêmes autrement que par le canal externe (email) où on le leur
    communique."""

    class Meta:
        model = ResponsableInvitationCode
        fields = ["code", "utilise", "utilise_le", "created_at"]
        read_only_fields = fields


class RejoindreEtablissementSerializer(serializers.Serializer):
    """Rédemption publique du code responsable : crée le compte
    ETABLISSEMENT_ADMIN en un seul geste, pas de connexion préalable requise
    (le responsable n'a en général pas encore de compte à ce stade)."""

    code = serializers.CharField()
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True, min_length=8)
    first_name = serializers.CharField(max_length=150)
    last_name = serializers.CharField(max_length=150)

    def validate_email(self, value):
        if User.objects.filter(email__iexact=value).exists():
            raise serializers.ValidationError("Un compte existe déjà avec cet email.")
        return value

    def validate_code(self, value):
        pending = ResponsableInvitationCode.objects.filter(code=value.strip().upper(), utilise=False).first()
        if pending is None:
            raise serializers.ValidationError("Code invalide, déjà utilisé, ou expiré.")
        return pending  # transformé en l'objet lui-même pour la vue


class FiliereSerializer(serializers.ModelSerializer):
    nombre_classes = serializers.IntegerField(source="classes.count", read_only=True)

    class Meta:
        model = Filiere
        fields = ["id", "nom", "nombre_classes", "created_at"]
        read_only_fields = ["id", "created_at"]


class ClasseSerializer(serializers.ModelSerializer):
    filiere_nom = serializers.CharField(source="filiere.nom", read_only=True, default=None)
    nombre_eleves = serializers.IntegerField(source="eleves.count", read_only=True)

    class Meta:
        model = Classe
        fields = ["id", "nom", "filiere", "filiere_nom", "nombre_eleves", "created_at"]
        read_only_fields = ["id", "created_at"]

    def validate_filiere(self, value):
        # Empêche un admin établissement d'attacher une classe à la filière
        # d'un AUTRE établissement (l'auto-complétion du champ ne filtre pas
        # par établissement côté DRF, donc c'est ici que ça se bloque).
        if value is None:
            return value
        request = self.context["request"]
        if value.etablissement_id != request.user.etablissement_id:
            raise serializers.ValidationError("Cette filière n'appartient pas à votre établissement.")
        return value


class ImportApprenantsSerializer(serializers.Serializer):
    """Import en masse : un fichier (.csv/.xlsx, colonnes nom + email) et la
    classe à laquelle rattacher tout le monde — cette dernière doit
    appartenir au même établissement que l'admin qui importe."""

    classe = serializers.PrimaryKeyRelatedField(queryset=Classe.objects.all())
    file = serializers.FileField()

    def validate_classe(self, value):
        request = self.context["request"]
        if value.etablissement_id != request.user.etablissement_id:
            raise serializers.ValidationError("Cette classe n'appartient pas à votre établissement.")
        return value

    def validate_file(self, value):
        nom = (value.name or "").lower()
        if not (nom.endswith(".csv") or nom.endswith(".xlsx")):
            raise serializers.ValidationError("Format non supporté — utilisez un fichier .csv ou .xlsx.")
        return value


class EtablissementMembreSerializer(serializers.ModelSerializer):
    """Vue d'un formateur/apprenant depuis l'espace établissement — tout en
    lecture sauf `is_active` et `classe` (bloquer/débloquer, affecter à une
    classe). Modifier l'email, le rôle ou le nom reste réservé à l'admin
    plateforme (AdminUserSerializer), pas à ce serializer."""

    classe_nom = serializers.CharField(source="classe.nom", read_only=True, default=None)

    class Meta:
        model = User
        fields = ["id", "email", "first_name", "last_name", "role", "is_active", "classe", "classe_nom", "date_joined"]
        read_only_fields = ["id", "email", "first_name", "last_name", "role", "date_joined"]

    def validate_classe(self, value):
        if value is None:
            return value
        request = self.context["request"]
        if value.etablissement_id != request.user.etablissement_id:
            raise serializers.ValidationError("Cette classe n'appartient pas à votre établissement.")
        return value


class EtablissementSerializer(serializers.ModelSerializer):
    nombre_membres = serializers.IntegerField(source="membres.count", read_only=True)
    abonnement_actif = serializers.SerializerMethodField()

    class Meta:
        model = Etablissement
        fields = ["id", "nom", "code_invitation", "actif", "nombre_membres", "abonnement_actif", "created_at"]
        read_only_fields = ["id", "code_invitation", "created_at"]

    def get_abonnement_actif(self, obj):
        abonnement = next((a for a in obj.abonnements.all() if a.est_actif), None)
        if not abonnement:
            return None
        return {"plan_nom": abonnement.plan.nom, "date_fin": abonnement.date_fin}


class PlanSerializer(serializers.ModelSerializer):
    class Meta:
        model = Plan
        fields = [
            "id",
            "nom",
            "type",
            "prix_mensuel",
            "description",
            "avantages",
            "duree_mois",
            "max_membres",
            "actif",
        ]

    def validate_avantages(self, value):
        if not isinstance(value, list) or not all(isinstance(item, str) for item in value):
            raise serializers.ValidationError("Les avantages doivent être une liste de textes.")
        return value


class AbonnementSerializer(serializers.ModelSerializer):
    user_email = serializers.CharField(source="user.email", read_only=True, default=None)
    etablissement_nom = serializers.CharField(source="etablissement.nom", read_only=True, default=None)
    plan_nom = serializers.CharField(source="plan.nom", read_only=True)
    est_actif = serializers.BooleanField(read_only=True)

    class Meta:
        model = Abonnement
        fields = [
            "id",
            "user",
            "user_email",
            "etablissement",
            "etablissement_nom",
            "plan",
            "plan_nom",
            "date_debut",
            "date_fin",
            "statut",
            "est_actif",
            "created_at",
        ]
        read_only_fields = ["id", "created_at"]

    def validate(self, attrs):
        user = attrs.get("user", getattr(self.instance, "user", None))
        etablissement = attrs.get("etablissement", getattr(self.instance, "etablissement", None))
        if bool(user) == bool(etablissement):
            raise serializers.ValidationError(
                "Un abonnement appartient soit à un utilisateur, soit à un établissement (exactement un des deux)."
            )

        plan = attrs.get("plan", getattr(self.instance, "plan", None))
        if plan:
            if user and plan.type != Plan.TypePlan.INDIVIDUEL:
                raise serializers.ValidationError({"plan": "Ce plan est réservé aux établissements."})
            if etablissement and plan.type != Plan.TypePlan.ETABLISSEMENT:
                raise serializers.ValidationError({"plan": "Ce plan est réservé aux particuliers."})

        date_debut = attrs.get("date_debut", getattr(self.instance, "date_debut", None))
        date_fin = attrs.get("date_fin", getattr(self.instance, "date_fin", None))
        if date_debut and date_fin and date_fin <= date_debut:
            raise serializers.ValidationError({"date_fin": "La date de fin doit être après la date de début."})
        return attrs
