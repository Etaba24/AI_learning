from django.contrib.auth.password_validation import validate_password
from rest_framework import serializers

from .models import User


class RegisterSerializer(serializers.ModelSerializer):
    """RF-001 : inscription publique, limitée aux rôles Apprenant/Formateur
    (un compte Administrateur ne se crée jamais par ce formulaire, cf.
    RF-005 : c'est un autre admin qui le fait)."""

    password = serializers.CharField(write_only=True, validators=[validate_password])

    class Meta:
        model = User
        fields = ["email", "password", "first_name", "last_name", "role", "departement"]

    def validate_role(self, value):
        if value not in (User.Role.STUDENT, User.Role.INSTRUCTOR):
            raise serializers.ValidationError(
                "Seuls les rôles Apprenant ou Formateur sont autorisés à l'inscription."
            )
        return value

    def validate(self, attrs):
        # Un formateur doit appartenir à un département ; un apprenant n'en
        # a pas besoin (le champ reste vide pour lui).
        if attrs.get("role") == User.Role.INSTRUCTOR and not attrs.get("departement"):
            raise serializers.ValidationError({"departement": "Un formateur doit appartenir à un département."})
        return attrs

    def create(self, validated_data):
        return User.objects.create_user(**validated_data)


class UserSerializer(serializers.ModelSerializer):
    """RF-007 : consultation/modification du profil. email et role sont en
    lecture seule ici : ce ne sont pas des champs qu'on laisse l'utilisateur
    changer lui-même depuis son profil."""

    class Meta:
        model = User
        fields = ["id", "email", "first_name", "last_name", "role", "bio", "avatar_url", "date_joined"]
        read_only_fields = ["id", "email", "role", "date_joined"]


class AdminUserSerializer(serializers.ModelSerializer):
    """RF-005/RF-006 : vue admin sur un compte tiers. Contrairement à
    UserSerializer (le profil de l'utilisateur sur lui-même), ici email,
    role et is_active sont modifiables — c'est justement le but (modifier,
    désactiver un compte). Le mot de passe ne se change jamais par ce
    serializer (pas de champ password) : seul le titulaire du compte le
    fait, via le flux de réinitialisation."""

    departement_nom = serializers.CharField(source="departement.nom", read_only=True, default=None)

    class Meta:
        model = User
        fields = [
            "id",
            "email",
            "first_name",
            "last_name",
            "role",
            "is_active",
            "departement",
            "departement_nom",
            "bio",
            "avatar_url",
            "date_joined",
        ]
        read_only_fields = ["id", "date_joined"]

    def validate(self, attrs):
        role = attrs.get("role", getattr(self.instance, "role", None))
        departement = attrs.get("departement", getattr(self.instance, "departement", None))
        if role == User.Role.INSTRUCTOR and not departement:
            raise serializers.ValidationError({"departement": "Un formateur doit appartenir à un département."})
        return attrs


class PasswordResetRequestSerializer(serializers.Serializer):
    email = serializers.EmailField()


class PasswordResetConfirmSerializer(serializers.Serializer):
    uid = serializers.CharField()
    token = serializers.CharField()
    new_password = serializers.CharField(validators=[validate_password])
