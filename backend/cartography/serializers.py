from rest_framework import serializers

from .models import Carte


class CarteListSerializer(serializers.ModelSerializer):
    """Version allégée pour la liste : sans `elements`."""

    class Meta:
        model = Carte
        fields = ["id", "nom", "created_at", "updated_at"]


class CarteSerializer(serializers.ModelSerializer):
    class Meta:
        model = Carte
        fields = ["id", "nom", "elements", "centre_lat", "centre_lng", "zoom", "created_at", "updated_at"]

    def validate_elements(self, value):
        if not isinstance(value, list):
            raise serializers.ValidationError("Les éléments doivent être une liste.")
        return value
