from rest_framework import serializers

from .models import Tableau


class TableauListSerializer(serializers.ModelSerializer):
    """Version allégée pour la liste : sans `scene`, qui peut être lourd."""

    class Meta:
        model = Tableau
        fields = ["id", "nom", "created_at", "updated_at"]


class TableauSerializer(serializers.ModelSerializer):
    class Meta:
        model = Tableau
        fields = ["id", "nom", "scene", "created_at", "updated_at"]

    def validate_scene(self, value):
        if not isinstance(value, list):
            raise serializers.ValidationError("La scène doit être une liste d'éléments.")
        return value
