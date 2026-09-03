from rest_framework import serializers

from .models import Departement


class ContactMessageSerializer(serializers.Serializer):
    """Formulaire "Nous contacter" de la page publique — pas de compte requis."""

    name = serializers.CharField(max_length=150)
    email = serializers.EmailField()
    message = serializers.CharField(max_length=5000)


class DepartementSerializer(serializers.ModelSerializer):
    class Meta:
        model = Departement
        fields = ["id", "nom", "description"]
