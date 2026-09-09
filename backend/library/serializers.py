from rest_framework import serializers

from core.uploads import extension_de, valider_signature_fichier
from trainings.models import Category

from .models import Document

# Extension attendue pour chaque format déclaré, et taille max (audit
# sécurité : cette vue n'avait auparavant AUCUNE validation — ni extension,
# ni taille, ni contenu — un fichier de n'importe quel type et n'importe
# quelle taille pouvait être déposé tel quel dans le stockage média.
_EXTENSIONS_PAR_FORMAT = {
    Document.Format.PDF: (".pdf",),
    Document.Format.EPUB: (".epub",),
}
_TAILLE_MAX_OCTETS = 50 * 1024 * 1024  # 50 Mo, même limite que les autres supports de l'app


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

    def validate(self, attrs):
        fichier = attrs.get("fichier")
        if fichier is None:
            return attrs

        format_declare = attrs.get("format") or getattr(self.instance, "format", None)
        extensions_attendues = _EXTENSIONS_PAR_FORMAT.get(format_declare, ())
        extension = extension_de(fichier.name)

        if not extensions_attendues or extension not in extensions_attendues:
            raise serializers.ValidationError(
                {"fichier": f"Le fichier doit être au format {format_declare} ({'/'.join(extensions_attendues) or '?'})."}
            )
        if fichier.size > _TAILLE_MAX_OCTETS:
            raise serializers.ValidationError({"fichier": "Fichier trop volumineux (50 Mo maximum)."})
        if not valider_signature_fichier(fichier, extension):
            raise serializers.ValidationError(
                {"fichier": "Le contenu du fichier ne correspond pas à son extension déclarée."}
            )
        return attrs
