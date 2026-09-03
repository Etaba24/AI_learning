from rest_framework import serializers
from .models import Certification


class CertificationSerializer(serializers.ModelSerializer):
    apprenant_nom = serializers.SerializerMethodField()
    formation_titre = serializers.CharField(source="formation.titre", read_only=True)
    auteur_nom = serializers.SerializerMethodField()

    class Meta:
        model = Certification
        fields = [
            "id",
            "apprenant",
            "apprenant_nom",
            "formation",
            "formation_titre",
            "auteur_nom",
            "identifiant_public",
            "created_at",
        ]
        read_only_fields = ["identifiant_public", "created_at"]

    def get_apprenant_nom(self, obj):
        return f"{obj.apprenant.first_name} {obj.apprenant.last_name}".strip() or obj.apprenant.email

    def get_auteur_nom(self, obj):
        return f"{obj.formation.auteur.first_name} {obj.formation.auteur.last_name}".strip() or obj.formation.auteur.email
