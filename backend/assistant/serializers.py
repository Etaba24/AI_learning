from rest_framework import serializers

from .models import ConversationIA


class ConversationIASerializer(serializers.ModelSerializer):
    lecons_associees = serializers.PrimaryKeyRelatedField(many=True, read_only=True)

    class Meta:
        model = ConversationIA
        fields = ["id", "lecon", "lecons_associees", "question", "reponse", "created_at"]
        read_only_fields = ["reponse", "lecons_associees", "created_at"]


class AskSerializer(serializers.Serializer):
    """Entrée de POST /api/assistant/ask/ : jamais de champ "reponse" ou de
    "contexte" fournis par le client (RNF-003) — seuls lecon+question(+leçons
    associées) sont acceptés, le contexte pédagogique est reconstruit côté
    serveur (AssistantAskView vérifie que chaque leçon associée appartient
    bien à la même formation que `lecon` avant de l'inclure)."""

    lecon = serializers.UUIDField()
    question = serializers.CharField(max_length=2000, trim_whitespace=True)
    # Multi-choix optionnel : d'autres leçons de la même formation, liées
    # entre elles, à inclure dans le contexte pour une meilleure compréhension.
    lecons_associees = serializers.ListField(
        child=serializers.UUIDField(), required=False, default=list, max_length=10
    )

    def validate_question(self, value):
        if not value.strip():
            raise serializers.ValidationError("La question ne peut pas être vide.")
        return value
