from rest_framework import serializers

from .models import Sketch


class SketchListSerializer(serializers.ModelSerializer):
    """Version allégée pour la liste : sans `code`."""

    class Meta:
        model = Sketch
        fields = ["id", "nom", "created_at", "updated_at"]


class SketchSerializer(serializers.ModelSerializer):
    class Meta:
        model = Sketch
        fields = ["id", "nom", "code", "circuit", "created_at", "updated_at"]

    def validate_circuit(self, value):
        if not isinstance(value, dict):
            raise serializers.ValidationError("Le montage doit être un objet.")
        return value
