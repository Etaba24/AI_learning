from rest_framework import serializers

from .models import ConversationIA


class ConversationIASerializer(serializers.ModelSerializer):
    class Meta:
        model = ConversationIA
        fields = ["id", "lecon", "question", "reponse", "created_at"]
        read_only_fields = ["reponse", "created_at"]


class AskSerializer(serializers.Serializer):
    """Entrée de POST /api/assistant/ask/ : jamais de champ "reponse" ou de
    "contexte" fournis par le client (RNF-003) — seuls lecon+question sont
    acceptés, le contexte pédagogique est reconstruit côté serveur."""

    lecon = serializers.UUIDField()
    question = serializers.CharField(max_length=2000, trim_whitespace=True)

    def validate_question(self, value):
        if not value.strip():
            raise serializers.ValidationError("La question ne peut pas être vide.")
        return value
