from rest_framework import serializers

from .models import Note


class NoteSerializer(serializers.ModelSerializer):
    lecon_titre = serializers.CharField(source="lecon.titre", read_only=True, default=None)
    formation_titre = serializers.CharField(
        source="lecon.module.formation.titre", read_only=True, default=None
    )

    class Meta:
        model = Note
        fields = [
            "id",
            "titre",
            "contenu",
            "lecon",
            "lecon_titre",
            "formation_titre",
            "created_at",
            "updated_at",
        ]
