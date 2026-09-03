from rest_framework import serializers
from trainings.models import Formation, Lecon
from .models import Inscription, Progression


class InscriptionSerializer(serializers.ModelSerializer):
    """RF-022 : inscription à une formation. RG-004 vérifiée dans
    validate_formation (statut Publiée obligatoire)."""

    formation_titre = serializers.CharField(source="formation.titre", read_only=True)
    formation_niveau = serializers.CharField(source="formation.niveau", read_only=True)
    progress_percent = serializers.SerializerMethodField()

    class Meta:
        model = Inscription
        fields = [
            "id",
            "formation",
            "formation_titre",
            "formation_niveau",
            "statut",
            "progress_percent",
            "created_at",
        ]
        read_only_fields = ["statut"]

    def get_progress_percent(self, obj):
        """RF-025 : progression = leçons terminées / total des leçons."""
        total = Lecon.objects.filter(module__formation_id=obj.formation_id).count()
        if total == 0:
            return 0
        completed = obj.progressions.filter(statut=Progression.Statut.TERMINEE).count()
        return round(completed / total * 100)

    def validate_formation(self, value):
        if value.statut != Formation.Statut.PUBLIEE:
            raise serializers.ValidationError("Impossible de s'inscrire à une formation qui n'est pas publiée.")
        return value

    def validate(self, attrs):
        request = self.context["request"]
        if self.instance is None and Inscription.objects.filter(
            apprenant=request.user, formation=attrs["formation"]
        ).exists():
            raise serializers.ValidationError("Vous êtes déjà inscrit à cette formation.")
        return attrs


class ProgressionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Progression
        fields = ["id", "inscription", "lecon", "statut", "video_progression_percent", "score"]
        read_only_fields = ["inscription"]
