from django.contrib.auth.password_validation import validate_password
from rest_framework import serializers

from core.models import Departement
from trainings.models import Category

from .models import User


class RegisterSerializer(serializers.ModelSerializer):
    """RF-001 : inscription publique, limitée aux rôles Apprenant/Formateur
    (un compte Administrateur ne se crée jamais par ce formulaire, cf.
    RF-005 : c'est un autre admin qui le fait)."""

    password = serializers.CharField(write_only=True, validators=[validate_password])
    # B2B : code partagé par un établissement à ses membres. Optionnel —
    # sans code, inscription grand public classique.
    code_etablissement = serializers.CharField(write_only=True, required=False, allow_blank=True)
    # Centres d'intérêt (apprenant) : débloquent gratuitement les outils
    # premium associés à chaque catégorie choisie (jamais un abonnement
    # complet) — voir trainings.Category.outils_associes.
    categories_interet = serializers.PrimaryKeyRelatedField(
        many=True, queryset=Category.objects.all(), required=False, default=list
    )
    # Un formateur peut appartenir à plusieurs départements (au moins un
    # requis — voir validate() ci-dessous) ; sans objet pour un apprenant.
    departements = serializers.PrimaryKeyRelatedField(
        many=True, queryset=Departement.objects.all(), required=False, default=list
    )

    class Meta:
        model = User
        fields = [
            "email",
            "password",
            "first_name",
            "last_name",
            "role",
            "departements",
            "code_etablissement",
            "categories_interet",
        ]

    def validate_code_etablissement(self, value):
        if not value:
            return None
        from billing.models import Etablissement
        from billing.services import abonnement_actif_pour  # noqa: F401 (cohérence import)

        try:
            etablissement = Etablissement.objects.get(code_invitation=value.strip().upper(), actif=True)
        except Etablissement.DoesNotExist:
            raise serializers.ValidationError("Code établissement invalide.")

        # Limite de places du plan de l'établissement (si l'abonnement en fixe une).
        abonnement = next((a for a in etablissement.abonnements.all() if a.est_actif), None)
        if abonnement and abonnement.plan.max_membres is not None:
            if etablissement.membres.count() >= abonnement.plan.max_membres:
                raise serializers.ValidationError(
                    "Cet établissement a atteint son nombre maximum de membres."
                )
        return etablissement

    def validate_role(self, value):
        if value not in (User.Role.STUDENT, User.Role.INSTRUCTOR):
            raise serializers.ValidationError(
                "Seuls les rôles Apprenant ou Formateur sont autorisés à l'inscription."
            )
        return value

    def validate(self, attrs):
        # Un formateur doit appartenir à au moins un département ; un
        # apprenant n'en a pas besoin (le champ reste vide pour lui).
        if attrs.get("role") == User.Role.INSTRUCTOR and not attrs.get("departements"):
            raise serializers.ValidationError(
                {"departements": "Un formateur doit appartenir à au moins un département."}
            )
        return attrs

    def create(self, validated_data):
        # validate_code_etablissement a déjà transformé le code en objet.
        etablissement = validated_data.pop("code_etablissement", None)
        # M2M : ne peuvent être posés qu'après la création (l'instance a
        # besoin d'un pk), donc retirés ici puis appliqués via .set() ensuite.
        categories_interet = validated_data.pop("categories_interet", [])
        departements = validated_data.pop("departements", [])
        user = User.objects.create_user(**validated_data)
        if etablissement:
            user.etablissement = etablissement
            user.save(update_fields=["etablissement"])
        if categories_interet:
            user.categories_interet.set(categories_interet)
        if departements:
            user.departements.set(departements)
        return user


class UserSerializer(serializers.ModelSerializer):
    """RF-007 : consultation/modification du profil. email et role sont en
    lecture seule ici : ce ne sont pas des champs qu'on laisse l'utilisateur
    changer lui-même depuis son profil."""

    etablissement_nom = serializers.CharField(source="etablissement.nom", read_only=True, default=None)
    departements_noms = serializers.SlugRelatedField(source="departements", slug_field="nom", many=True, read_only=True)

    class Meta:
        model = User
        fields = [
            "id",
            "email",
            "first_name",
            "last_name",
            "role",
            "bio",
            "avatar_url",
            "etablissement_nom",
            "departements_noms",
            "date_joined",
        ]
        read_only_fields = ["id", "email", "role", "etablissement_nom", "date_joined"]


class AdminUserSerializer(serializers.ModelSerializer):
    """RF-005/RF-006 : vue admin sur un compte tiers. Contrairement à
    UserSerializer (le profil de l'utilisateur sur lui-même), ici email,
    role et is_active sont modifiables — c'est justement le but (modifier,
    désactiver un compte). Le mot de passe ne se change jamais par ce
    serializer (pas de champ password) : seul le titulaire du compte le
    fait, via le flux de réinitialisation."""

    departements_noms = serializers.SlugRelatedField(source="departements", slug_field="nom", many=True, read_only=True)

    class Meta:
        model = User
        fields = [
            "id",
            "email",
            "first_name",
            "last_name",
            "role",
            "is_active",
            "departements",
            "departements_noms",
            "bio",
            "avatar_url",
            "date_joined",
        ]
        read_only_fields = ["id", "date_joined"]

    def validate(self, attrs):
        role = attrs.get("role", getattr(self.instance, "role", None))
        if "departements" in attrs:
            departements = attrs.get("departements")
        elif self.instance:
            departements = list(self.instance.departements.all())
        else:
            departements = None
        if role == User.Role.INSTRUCTOR and not departements:
            raise serializers.ValidationError(
                {"departements": "Un formateur doit appartenir à au moins un département."}
            )
        return attrs


class PasswordChangeSerializer(serializers.Serializer):
    """Changement de mot de passe en self-service (utilisateur déjà
    connecté) — distinct du flux par email (PasswordReset*) réservé au cas
    où l'utilisateur a oublié son mot de passe et ne peut pas se connecter."""

    current_password = serializers.CharField(write_only=True)
    new_password = serializers.CharField(write_only=True, validators=[validate_password])


class GoogleAuthSerializer(serializers.Serializer):
    """Jeton d'identité renvoyé par Google Identity Services côté client
    (`credential` dans la réponse du bouton Google) — jamais généré ni
    interprété côté frontend, uniquement transmis tel quel puis vérifié
    auprès de Google par le backend (RNF sécurité : ne jamais faire
    confiance à des données d'identité non vérifiées serveur)."""

    credential = serializers.CharField()


class GoogleConfirmSerializer(serializers.Serializer):
    email = serializers.EmailField()
    code = serializers.CharField(min_length=4, max_length=4)


class PasswordResetRequestSerializer(serializers.Serializer):
    email = serializers.EmailField()


class PasswordResetConfirmSerializer(serializers.Serializer):
    uid = serializers.CharField()
    token = serializers.CharField()
    new_password = serializers.CharField(validators=[validate_password])
