from rest_framework import serializers

from .models import Classeur


class ClasseurListSerializer(serializers.ModelSerializer):
    """Version allégée pour la liste : sans `donnees`, qui peut être lourd."""

    class Meta:
        model = Classeur
        fields = ["id", "nom", "created_at", "updated_at"]


class ClasseurSerializer(serializers.ModelSerializer):
    class Meta:
        model = Classeur
        fields = ["id", "nom", "donnees", "created_at", "updated_at"]

    def validate_donnees(self, value):
        if not isinstance(value, list):
            raise serializers.ValidationError("Les données doivent être une liste de lignes.")
        return value
