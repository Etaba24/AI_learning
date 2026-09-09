from django.core.files.storage import default_storage
from django.db.models import ProtectedError, Q
from django.shortcuts import get_object_or_404
from rest_framework import generics, status
from rest_framework.exceptions import PermissionDenied
from rest_framework.parsers import FormParser, MultiPartParser
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.models import User
from accounts.permissions import IsAdmin, IsInstructorOrAdmin
from core.uploads import extension_de, valider_signature_fichier
from core.utils import log_activity

from .models import Category, Formation, Lecon, Module, Ressource
from .serializers import (
    CategorySerializer,
    FormationContenuSerializer,
    FormationSerializer,
    LeconSerializer,
    ModuleSerializer,
    PublicFormationDetailSerializer,
    PublicFormationSerializer,
    RessourceSerializer,
)


class CategoryListCreateView(generics.ListCreateAPIView):
    """RF-018 : catégories consultables et gérées par l'admin et les formateurs."""

    queryset = Category.objects.all()
    serializer_class = CategorySerializer
    permission_classes = [IsInstructorOrAdmin]


class CategoryDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = Category.objects.all()
    serializer_class = CategorySerializer
    permission_classes = [IsInstructorOrAdmin]

    def destroy(self, request, *args, **kwargs):
        try:
            return super().destroy(request, *args, **kwargs)
        except ProtectedError:
            return Response(
                {"detail": "Cette catégorie est utilisée par au moins une formation, impossible de la supprimer."},
                status=status.HTTP_400_BAD_REQUEST,
            )


class FormationListCreateView(generics.ListCreateAPIView):
    """RF-008/RF-017 : l'admin voit toutes les formations, le formateur ne voit que celles qu'il a créées."""

    serializer_class = FormationSerializer
    permission_classes = [IsInstructorOrAdmin]

    def get_queryset(self):
        queryset = Formation.objects.select_related("categorie", "auteur").all()
        user = self.request.user
        if user.is_authenticated and user.role == User.Role.INSTRUCTOR:
            queryset = queryset.filter(auteur=user)
        statut = self.request.query_params.get("statut")
        if statut:
            queryset = queryset.filter(statut=statut)
        q = self.request.query_params.get("q")
        if q:
            queryset = queryset.filter(
                Q(titre__icontains=q) | Q(categorie__nom__icontains=q) | Q(auteur__email__icontains=q)
            )
        return queryset

    def perform_create(self, serializer):
        serializer.save(auteur=self.request.user)


class FormationDetailView(generics.RetrieveUpdateDestroyAPIView):
    """Modifie uniquement les métadonnées de sa propre formation pour un formateur."""

    serializer_class = FormationSerializer
    permission_classes = [IsInstructorOrAdmin]

    def get_queryset(self):
        queryset = Formation.objects.select_related("categorie", "auteur").all()
        user = self.request.user
        if user.is_authenticated and user.role == User.Role.INSTRUCTOR:
            queryset = queryset.filter(auteur=user)
        return queryset


class FormationContenuView(generics.RetrieveAPIView):
    """GET /api/formations/<id>/contenu/ — contenu pédagogique COMPLET
    (vidéos, supports téléchargeables, corrections d'exercices) d'une
    formation. Contrairement au catalogue public (résumé seul — voir
    PublicLeconSerializer), cette vue exige que l'appelant soit :
      - l'administrateur (n'importe quelle formation, y compris brouillon),
      - le formateur auteur (prévisualisation de son propre brouillon), ou
      - un apprenant réellement inscrit à cette formation.
    Sans quoi 403 — jamais de contenu servi "parce que l'id est connu"."""

    queryset = Formation.objects.all()
    serializer_class = FormationContenuSerializer
    permission_classes = [IsAuthenticated]

    def get_object(self):
        formation = get_object_or_404(Formation.objects.select_related("auteur"), pk=self.kwargs["pk"])
        user = self.request.user

        if user.role == User.Role.ADMIN:
            return formation
        if user.role == User.Role.INSTRUCTOR and formation.auteur_id == user.id:
            return formation

        from enrollments.models import Inscription

        if Inscription.objects.filter(apprenant=user, formation=formation).exists():
            return formation

        raise PermissionDenied(
            "Vous devez être inscrit à cette formation pour en consulter le contenu."
        )


class _FormationTransitionView(APIView):
    """Base commune aux 5 vues de transition de statut : chacune vérifie que la
    formation est dans le bon statut de départ avant d'agir et journalise l'action."""

    permission_classes = [IsInstructorOrAdmin]
    expected_status = None
    next_status = None
    action_label = None

    def get_error_message(self):
        return f"Cette action nécessite une formation au statut « {self.expected_status.label} »."

    def apply_transition(self, formation, request):
        formation.statut = self.next_status
        formation.save()

    def post(self, request, pk):
        formation = get_object_or_404(Formation, pk=pk)
        if request.user.role == User.Role.INSTRUCTOR and formation.auteur != request.user:
            return Response(
                {"detail": "Vous n'avez pas la permission de modifier cette formation."},
                status=status.HTTP_403_FORBIDDEN,
            )
        if formation.statut != self.expected_status:
            return Response({"detail": self.get_error_message()}, status=status.HTTP_400_BAD_REQUEST)
        self.apply_transition(formation, request)
        log_activity(request.user, self.action_label, formation.titre)
        return Response(FormationSerializer(formation).data)


class FormationSubmitView(_FormationTransitionView):
    """POST /api/formations/<id>/submit/ — BROUILLON -> SOUMISE."""

    expected_status = Formation.Statut.BROUILLON
    next_status = Formation.Statut.SOUMISE
    action_label = "FORMATION_SOUMISE"


class FormationValidateView(_FormationTransitionView):
    """POST /api/formations/<id>/validate/ — SOUMISE -> VALIDEE (RG-002).

    Réservé à l'Administrateur (pas IsInstructorOrAdmin comme la classe de
    base) : sans ça, un formateur pouvait valider sa propre soumission
    (le contrôle hérité ne bloque qu'agir sur la formation d'un AUTRE
    formateur, pas sur la sienne), ce qui viole RG-002."""

    permission_classes = [IsAdmin]
    expected_status = Formation.Statut.SOUMISE
    next_status = Formation.Statut.VALIDEE
    action_label = "FORMATION_VALIDEE"

    def apply_transition(self, formation, request):
        formation.statut = self.next_status
        formation.motif_refus = ""
        formation.save()


class FormationRefuseView(_FormationTransitionView):
    """POST /api/formations/<id>/refuse/ — SOUMISE -> REFUSEE, motif requis.
    Réservé à l'Administrateur, même raison que FormationValidateView."""

    permission_classes = [IsAdmin]
    expected_status = Formation.Statut.SOUMISE
    next_status = Formation.Statut.REFUSEE
    action_label = "FORMATION_REFUSEE"

    def post(self, request, pk):
        motif = (request.data.get("motif") or "").strip()
        if not motif:
            return Response({"detail": "Un motif de refus est requis."}, status=status.HTTP_400_BAD_REQUEST)
        formation = get_object_or_404(Formation, pk=pk)
        if formation.statut != self.expected_status:
            return Response({"detail": self.get_error_message()}, status=status.HTTP_400_BAD_REQUEST)
        formation.statut = self.next_status
        formation.motif_refus = motif
        formation.save()
        log_activity(request.user, self.action_label, f"{formation.titre} : {motif}")
        return Response(FormationSerializer(formation).data)


class FormationPublishView(APIView):
    """POST /api/formations/<id>/publish/ — BROUILLON ou VALIDEE -> PUBLIEE."""

    permission_classes = [IsInstructorOrAdmin]

    def post(self, request, pk):
        formation = get_object_or_404(Formation, pk=pk)
        if request.user.role == User.Role.INSTRUCTOR:
            if formation.auteur != request.user:
                return Response(
                    {"detail": "Vous n'avez pas la permission de publier cette formation."},
                    status=status.HTTP_403_FORBIDDEN,
                )
            if formation.statut != Formation.Statut.VALIDEE:
                return Response(
                    {"detail": "Votre formation doit d'abord être validée par un administrateur avant de pouvoir être publiée."},
                    status=status.HTTP_400_BAD_REQUEST,
                )
        elif formation.statut not in (Formation.Statut.BROUILLON, Formation.Statut.VALIDEE):
            return Response(
                {"detail": "Seule une formation en brouillon ou validée peut être publiée."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        formation.statut = Formation.Statut.PUBLIEE
        formation.save()
        log_activity(request.user, "FORMATION_PUBLIEE", formation.titre)
        return Response(FormationSerializer(formation).data)


class FormationUnpublishView(_FormationTransitionView):
    """POST /api/formations/<id>/unpublish/ — PUBLIEE -> DEPUBLIEE."""

    expected_status = Formation.Statut.PUBLIEE
    next_status = Formation.Statut.DEPUBLIEE
    action_label = "FORMATION_DEPUBLIEE"


class FormationAssignerView(APIView):
    """POST /api/formations/<id>/assigner/ — l'administrateur attribue (ou
    réattribue) une formation à un formateur, par exemple une formation
    qu'il a lui-même créée et souhaite confier à quelqu'un. `auteur` étant
    la seule notion de propriétaire dans tout le reste de l'app (visible
    dans "Mes formations", vérifié par les vues de transition...), la
    réassigner ici suffit à rendre la formation gérable par ce formateur.
    Réservé à l'administrateur : jamais un formateur, qui pourrait sinon
    se décharger de sa propre formation sur quelqu'un d'autre."""

    permission_classes = [IsAdmin]

    def post(self, request, pk):
        formation = get_object_or_404(Formation, pk=pk)
        formateur_id = request.data.get("formateur_id")
        if not formateur_id:
            return Response({"detail": "formateur_id est requis."}, status=status.HTTP_400_BAD_REQUEST)
        formateur = get_object_or_404(User, pk=formateur_id, role=User.Role.INSTRUCTOR)
        formation.auteur = formateur
        formation.save(update_fields=["auteur"])
        log_activity(request.user, "FORMATION_ASSIGNEE", f"{formation.titre} → {formateur.email}")
        return Response(FormationSerializer(formation).data)


# ============================================================
# Modules — imbriqués sous une formation (RF-009)
# ============================================================


def _formation_queryset_for(user):
    """Formations qu'un utilisateur a le droit de gérer (créer/modifier du
    contenu dedans) : toutes pour l'admin, seulement les siennes pour un
    formateur. Base commune à TOUTES les vues imbriquées (modules, leçons,
    ressources, exercices, quiz) — sans quoi chacune doit réimplémenter le
    même filtre et une seule oubliée rouvre l'IDOR (cf. audit sécurité :
    un formateur ne doit jamais pouvoir lire/modifier/supprimer le contenu
    d'une formation qui n'est pas la sienne)."""

    queryset = Formation.objects.all()
    if user.is_authenticated and user.role == User.Role.INSTRUCTOR:
        queryset = queryset.filter(auteur=user)
    return queryset


class ModuleListCreateView(generics.ListCreateAPIView):
    """GET/POST /api/formations/<formation_id>/modules/"""

    serializer_class = ModuleSerializer
    permission_classes = [IsInstructorOrAdmin]

    def get_queryset(self):
        return Module.objects.filter(
            formation_id=self.kwargs["formation_id"],
            formation__in=_formation_queryset_for(self.request.user),
        )

    def perform_create(self, serializer):
        formation = get_object_or_404(_formation_queryset_for(self.request.user), pk=self.kwargs["formation_id"])
        serializer.save(formation=formation)


class ModuleDetailView(generics.RetrieveUpdateDestroyAPIView):
    """GET/PATCH/DELETE /api/formations/<formation_id>/modules/<pk>/"""

    serializer_class = ModuleSerializer
    permission_classes = [IsInstructorOrAdmin]

    def get_queryset(self):
        return Module.objects.filter(
            formation_id=self.kwargs["formation_id"],
            formation__in=_formation_queryset_for(self.request.user),
        )


# ============================================================
# Leçons — imbriquées sous un module (RF-009/RF-010)
# ============================================================


class LeconListCreateView(generics.ListCreateAPIView):
    """GET/POST /api/modules/<module_id>/lecons/"""

    serializer_class = LeconSerializer
    permission_classes = [IsInstructorOrAdmin]

    def get_queryset(self):
        return Lecon.objects.filter(
            module_id=self.kwargs["module_id"],
            module__formation__in=_formation_queryset_for(self.request.user),
        )

    def perform_create(self, serializer):
        module = get_object_or_404(
            Module.objects.filter(formation__in=_formation_queryset_for(self.request.user)),
            pk=self.kwargs["module_id"],
        )
        serializer.save(module=module)


class LeconDetailView(generics.RetrieveUpdateDestroyAPIView):
    """GET/PATCH/DELETE /api/modules/<module_id>/lecons/<pk>/"""

    serializer_class = LeconSerializer
    permission_classes = [IsInstructorOrAdmin]

    def get_queryset(self):
        return Lecon.objects.filter(
            module_id=self.kwargs["module_id"],
            module__formation__in=_formation_queryset_for(self.request.user),
        )


class LeconVideoUploadView(APIView):
    """POST /api/lecons/videos/upload/ — dépôt réel d'un fichier vidéo pour
    une leçon (multipart, champ `fichier`), renvoie l'URL serveur réelle à
    stocker dans Lecon.video_url. Remplace l'ancien URL.createObjectURL()
    côté client : cette URL-là n'existe que dans l'onglet du navigateur qui
    vient de choisir le fichier, jamais persistée ni transmise à personne
    d'autre (ni à l'admin, ni à un apprenant, ni même à soi-même après un
    rechargement de page) — d'où la vidéo introuvable/illisible."""

    permission_classes = [IsInstructorOrAdmin]
    parser_classes = [MultiPartParser, FormParser]

    FORMATS_AUTORISES = (".mp4", ".webm", ".ogg", ".mov")
    TAILLE_MAX_OCTETS = 100 * 1024 * 1024  # 100 Mo

    def post(self, request):
        fichier = request.FILES.get("fichier")
        if not fichier:
            return Response({"detail": "Aucun fichier fourni."}, status=status.HTTP_400_BAD_REQUEST)

        nom = (fichier.name or "").lower()
        if not nom.endswith(self.FORMATS_AUTORISES):
            return Response(
                {"detail": "Format vidéo non supporté (mp4, webm, ogg, mov)."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if fichier.size > self.TAILLE_MAX_OCTETS:
            return Response({"detail": "Fichier trop volumineux (100 Mo maximum)."}, status=status.HTTP_400_BAD_REQUEST)
        if not valider_signature_fichier(fichier, extension_de(nom)):
            return Response(
                {"detail": "Le contenu du fichier ne correspond pas au format vidéo déclaré."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        chemin = default_storage.save(f"videos-lecons/{fichier.name}", fichier)
        video_url = request.build_absolute_uri(default_storage.url(chemin))
        return Response({"video_url": video_url}, status=status.HTTP_201_CREATED)


# ============================================================
# Ressources — imbriquées sous une leçon (RF-010)
# ============================================================


class RessourceUploadView(APIView):
    """POST /api/lecons/ressources/upload/ — dépôt réel d'un support de
    leçon (PDF/Office/image), même principe que LeconVideoUploadView : la
    Ressource elle-même (RF-010) ne stocke qu'une URL, jamais l'upload —
    cette vue lui fournit une URL réelle plutôt qu'une URL locale au
    navigateur qui ne survivrait pas à un rechargement de page."""

    permission_classes = [IsInstructorOrAdmin]
    parser_classes = [MultiPartParser, FormParser]

    FORMATS_AUTORISES = (".pdf", ".doc", ".docx", ".ppt", ".pptx", ".png", ".jpg", ".jpeg")
    TAILLE_MAX_OCTETS = 50 * 1024 * 1024  # 50 Mo

    def post(self, request):
        fichier = request.FILES.get("fichier")
        if not fichier:
            return Response({"detail": "Aucun fichier fourni."}, status=status.HTTP_400_BAD_REQUEST)

        nom = (fichier.name or "").lower()
        if not nom.endswith(self.FORMATS_AUTORISES):
            return Response(
                {"detail": "Format non supporté (pdf, doc, docx, ppt, pptx, png, jpg)."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if fichier.size > self.TAILLE_MAX_OCTETS:
            return Response({"detail": "Fichier trop volumineux (50 Mo maximum)."}, status=status.HTTP_400_BAD_REQUEST)
        if not valider_signature_fichier(fichier, extension_de(nom)):
            return Response(
                {"detail": "Le contenu du fichier ne correspond pas au format déclaré."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        chemin = default_storage.save(f"ressources-lecons/{fichier.name}", fichier)
        url = request.build_absolute_uri(default_storage.url(chemin))
        return Response({"url": url}, status=status.HTTP_201_CREATED)


class RessourceListCreateView(generics.ListCreateAPIView):
    """GET/POST /api/lecons/<lecon_id>/ressources/"""

    serializer_class = RessourceSerializer
    permission_classes = [IsInstructorOrAdmin]

    def get_queryset(self):
        return Ressource.objects.filter(
            lecon_id=self.kwargs["lecon_id"],
            lecon__module__formation__in=_formation_queryset_for(self.request.user),
        )

    def perform_create(self, serializer):
        lecon = get_object_or_404(
            Lecon.objects.filter(module__formation__in=_formation_queryset_for(self.request.user)),
            pk=self.kwargs["lecon_id"],
        )
        serializer.save(lecon=lecon)


class RessourceDetailView(generics.RetrieveUpdateDestroyAPIView):
    """GET/PATCH/DELETE /api/lecons/<lecon_id>/ressources/<pk>/"""

    serializer_class = RessourceSerializer
    permission_classes = [IsInstructorOrAdmin]

    def get_queryset(self):
        return Ressource.objects.filter(
            lecon_id=self.kwargs["lecon_id"],
            lecon__module__formation__in=_formation_queryset_for(self.request.user),
        )


# ============================================================
# Catalogue public — apprenant
# ============================================================


class PublicFormationListView(generics.ListAPIView):
    """GET /api/catalogue/formations/?q=...&categorie=<id>&niveau=..."""

    serializer_class = PublicFormationSerializer
    permission_classes = [AllowAny]

    def get_queryset(self):
        queryset = Formation.objects.filter(statut=Formation.Statut.PUBLIEE).select_related("categorie")

        categorie = self.request.query_params.get("categorie")
        if categorie:
            queryset = queryset.filter(categorie_id=categorie)

        niveau = self.request.query_params.get("niveau")
        if niveau:
            queryset = queryset.filter(niveau=niveau)

        q = self.request.query_params.get("q")
        if q:
            queryset = queryset.filter(Q(titre__icontains=q) | Q(description__icontains=q))

        return queryset


class PublicFormationDetailView(generics.RetrieveAPIView):
    """GET /api/catalogue/formations/<id>/"""

    queryset = Formation.objects.filter(statut=Formation.Statut.PUBLIEE)
    serializer_class = PublicFormationDetailSerializer
    permission_classes = [AllowAny]
