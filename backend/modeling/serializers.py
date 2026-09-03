from rest_framework import serializers

from .models import Scene3D


class Scene3DListSerializer(serializers.ModelSerializer):
    """Version allégée pour la liste : sans `objets`."""

    class Meta:
        model = Scene3D
        fields = ["id", "nom", "created_at", "updated_at"]


class Scene3DSerializer(serializers.ModelSerializer):
    class Meta:
        model = Scene3D
        fields = ["id", "nom", "objets", "created_at", "updated_at"]

    def validate_objets(self, value):
        if not isinstance(value, list):
            raise serializers.ValidationError("Les objets doivent être une liste.")
        return value
