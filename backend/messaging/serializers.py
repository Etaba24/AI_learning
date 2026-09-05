from rest_framework import serializers

from .models import Message


class MessageSerializer(serializers.ModelSerializer):
    expediteur_nom = serializers.SerializerMethodField()

    class Meta:
        model = Message
        fields = ["id", "conversation", "expediteur", "expediteur_nom", "contenu", "lu", "created_at"]
        read_only_fields = fields

    def get_expediteur_nom(self, obj):
        return f"{obj.expediteur.first_name} {obj.expediteur.last_name}".strip() or obj.expediteur.email


class EnvoiMessageSerializer(serializers.Serializer):
    contenu = serializers.CharField()

    def validate_contenu(self, value):
        value = value.strip()
        if not value:
            raise serializers.ValidationError("Le message ne peut pas être vide.")
        return value
