from rest_framework import serializers

from .models import Annonce


class AnnonceSerializer(serializers.ModelSerializer):
    categorie_display = serializers.CharField(source="get_categorie_display", read_only=True)

    class Meta:
        model = Annonce
        fields = [
            "id",
            "titre",
            "categorie",
            "categorie_display",
            "contenu",
            "auteur_label",
            "important",
            "created_at",
        ]
