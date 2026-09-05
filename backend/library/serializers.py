from rest_framework import serializers

from trainings.models import Category

from .models import Document


class DocumentSerializer(serializers.ModelSerializer):
    """statut et motif_refus en lecture seule : transitions contrôlées par
    les vues d'action, jamais un PATCH libre (même principe que Formation).
    taille_octets aussi en lecture seule : calculée côté serveur à partir
    du fichier réellement reçu, jamais une valeur envoyée par le client."""

    categorie_nom = serializers.CharField(source="categorie.nom", read_only=True)
    categorie = serializers.PrimaryKeyRelatedField(queryset=Category.objects.all())
    auteur = serializers.PrimaryKeyRelatedField(read_only=True)
    auteur_email = serializers.CharField(source="auteur.email", read_only=True)
    auteur_nom = serializers.SerializerMethodField()

    class Meta:
        model = Document
        fields = [
            "id",
            "titre",
            "description",
            "categorie",
            "categorie_nom",
            "format",
            "fichier",
            "taille_octets",
            "auteur",
            "auteur_email",
            "auteur_nom",
            "statut",
            "motif_refus",
            "created_at",
        ]
        read_only_fields = ["id", "taille_octets", "statut", "motif_refus", "created_at"]

    def get_auteur_nom(self, obj):
        return f"{obj.auteur.first_name} {obj.auteur.last_name}".strip() or obj.auteur.email
