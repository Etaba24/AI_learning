from accounts.models import User
from core.models import Departement
from rest_framework import serializers

from .models import Category, Formation, Lecon, Module, Ressource


class CategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = Category
        fields = ["id", "nom", "description"]


from assessments.serializers import ExerciceSerializer, QuizSerializer


class RessourceSerializer(serializers.ModelSerializer):
    url = serializers.CharField(required=False, allow_blank=True)

    class Meta:
        model = Ressource
        fields = ["id", "lecon", "nom", "type", "url"]
        read_only_fields = ["lecon"]  # posé depuis l'URL, jamais depuis le body


class LeconSerializer(serializers.ModelSerializer):
    video_url = serializers.CharField(required=False, allow_blank=True)
    ressources = RessourceSerializer(many=True, read_only=True)
    exercices = ExerciceSerializer(many=True, read_only=True)
    quiz = QuizSerializer(many=True, read_only=True)

    class Meta:
        model = Lecon
        fields = ["id", "module", "titre", "contenu", "video_url", "ordre", "ressources", "exercices", "quiz"]
        read_only_fields = ["module"]  # posé depuis l'URL, jamais depuis le body


class ModuleSerializer(serializers.ModelSerializer):
    """RG-003 : une formation n'est publiable que si un de ses modules a au
    moins une leçon -> on expose lecons et lecons_count pour le front."""

    lecons = LeconSerializer(many=True, read_only=True)
    lecons_count = serializers.IntegerField(source="lecons.count", read_only=True)

    class Meta:
        model = Module
        fields = ["id", "formation", "titre", "description", "ordre", "lecons", "lecons_count"]
        read_only_fields = ["formation"]  # posé depuis l'URL, jamais depuis le body


class FormationSerializer(serializers.ModelSerializer):
    """statut et motif_refus en lecture seule : transitions contrôlées par les vues d'action."""

    categorie_nom = serializers.CharField(source="categorie.nom", read_only=True)
    departement_nom = serializers.CharField(source="departement.nom", read_only=True)
    auteur = serializers.PrimaryKeyRelatedField(read_only=True)
    auteur_email = serializers.CharField(source="auteur.email", read_only=True)
    departement = serializers.PrimaryKeyRelatedField(queryset=Departement.objects.all(), required=True)
    modules = ModuleSerializer(many=True, read_only=True)
    completion_rate = serializers.SerializerMethodField()
    is_publishable = serializers.SerializerMethodField()

    class Meta:
        model = Formation
        fields = [
            "id",
            "titre",
            "description",
            "objectifs",
            "prerequis",
            "niveau",
            "duree_heures",
            "categorie",
            "categorie_nom",
            "departement",
            "departement_nom",
            "auteur",
            "auteur_email",
            "statut",
            "motif_refus",
            "modules",
            "completion_rate",
            "is_publishable",
            "created_at",
        ]
        read_only_fields = ["statut", "motif_refus"]

    def get_completion_rate(self, obj):
        """Calcul de complétion métrologique Python (Logique Métier)."""
        rate = 0
        if obj.titre and obj.description and obj.duree_heures > 0 and obj.categorie_id and obj.departement_id:
            rate += 25
        modules = obj.modules.all()
        if modules.exists():
            rate += 25
            all_valid_lecons = True
            for mod in modules:
                lecons = mod.lecons.all()
                if not lecons.exists():
                    all_valid_lecons = False
                    break
                for lec in lecons:
                    has_video = bool(lec.video_url)
                    has_contenu = bool(lec.contenu)
                    has_ressource = lec.ressources.exists()
                    has_exercice = lec.exercices.exists() or lec.quiz.exists()
                    if not (has_video and has_contenu and has_ressource and has_exercice):
                        all_valid_lecons = False
                        break
            if all_valid_lecons:
                rate += 50
        return rate

    def get_is_publishable(self, obj):
        return self.get_completion_rate(obj) == 100

    def validate(self, attrs):
        auteur = self.instance.auteur if self.instance else self.context["request"].user
        departement = attrs.get("departement", getattr(self.instance, "departement", None))
        if (
            auteur.role == User.Role.INSTRUCTOR
            and auteur.departement is not None
            and departement != auteur.departement
        ):
            raise serializers.ValidationError(
                "Un formateur ne peut créer une formation que dans son propre département."
            )
        if auteur.role == User.Role.INSTRUCTOR and auteur.departement is None and departement:
            auteur.departement = departement
            auteur.save(update_fields=["departement"])
        return attrs


# ============================================================
# Catalogue public (RF-020/RF-021) — uniquement les formations PUBLIEE,
# et jamais les champs internes (statut, motif_refus, auteur_email...).
# ============================================================


class PublicFormationSerializer(serializers.ModelSerializer):
    """Vue liste du catalogue : l'essentiel pour une carte de formation."""

    categorie_nom = serializers.CharField(source="categorie.nom", read_only=True)

    class Meta:
        model = Formation
        fields = ["id", "titre", "description", "niveau", "duree_heures", "categorie", "categorie_nom"]


class PublicLeconSerializer(serializers.ModelSerializer):
    """Sommaire uniquement — jamais le contenu réel (vidéo, supports,
    corrections d'exercices). Cette vue est AllowAny/pré-inscription : le
    contenu payant ne doit être atteignable qu'via FormationContenuView,
    qui vérifie une vraie inscription (ou la propriété/l'admin). Ne JAMAIS
    ajouter `video_url`/`ressources`/`exercices`/`contenu` ici, sous peine
    de recréer la fuite (RF-021 : contourne sinon tout le mur payant)."""

    class Meta:
        model = Lecon
        fields = ["id", "titre", "ordre"]


class PublicModuleSerializer(serializers.ModelSerializer):
    lecons = PublicLeconSerializer(many=True, read_only=True)

    class Meta:
        model = Module
        fields = ["id", "titre", "description", "ordre", "lecons"]


class PublicFormationDetailSerializer(PublicFormationSerializer):
    """Fiche détaillée avant inscription (RF-021) : ajoute objectifs,
    prérequis et le sommaire (titres des modules/leçons, pas le contenu —
    voir PublicLeconSerializer)."""

    modules = PublicModuleSerializer(many=True, read_only=True)

    class Meta(PublicFormationSerializer.Meta):
        fields = PublicFormationSerializer.Meta.fields + ["objectifs", "prerequis", "modules"]


# ============================================================
# Contenu réel d'une formation — réservé aux inscrits (ou à l'auteur
# formateur/l'admin en prévisualisation), jamais public. Chaîne de
# serializers volontairement séparée de PublicFormationDetailSerializer
# (jamais un héritage entre les deux) pour qu'un futur ajout de champ sur
# l'un ne puisse jamais fuiter accidentellement dans l'autre.
# ============================================================


class LeconContenuSerializer(serializers.ModelSerializer):
    ressources = RessourceSerializer(many=True, read_only=True)
    exercices = ExerciceSerializer(many=True, read_only=True)
    quiz = QuizSerializer(many=True, read_only=True)

    class Meta:
        model = Lecon
        fields = ["id", "titre", "contenu", "video_url", "ordre", "ressources", "exercices", "quiz"]


class ModuleContenuSerializer(serializers.ModelSerializer):
    lecons = LeconContenuSerializer(many=True, read_only=True)

    class Meta:
        model = Module
        fields = ["id", "titre", "description", "ordre", "lecons"]


class FormationContenuSerializer(serializers.ModelSerializer):
    modules = ModuleContenuSerializer(many=True, read_only=True)

    class Meta:
        model = Formation
        fields = ["id", "titre", "modules"]
