from django.db.models import ProtectedError, Q
from django.shortcuts import get_object_or_404
from rest_framework import generics, status
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.models import User
from accounts.permissions import IsAdmin, IsInstructorOrAdmin
from core.utils import log_activity

from .models import Category, Formation, Lecon, Module, Ressource
from .serializers import (
    CategorySerializer,
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
    """POST /api/formations/<id>/validate/ — SOUMISE -> VALIDEE (RG-002)."""

    expected_status = Formation.Statut.SOUMISE
    next_status = Formation.Statut.VALIDEE
    action_label = "FORMATION_VALIDEE"

    def apply_transition(self, formation, request):
        formation.statut = self.next_status
        formation.motif_refus = ""
        formation.save()


class FormationRefuseView(_FormationTransitionView):
    """POST /api/formations/<id>/refuse/ — SOUMISE -> REFUSEE, motif requis."""

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


# ============================================================
# Modules — imbriqués sous une formation (RF-009)
# ============================================================


class ModuleListCreateView(generics.ListCreateAPIView):
    """GET/POST /api/formations/<formation_id>/modules/"""

    serializer_class = ModuleSerializer
    permission_classes = [IsInstructorOrAdmin]

    def get_queryset(self):
        return Module.objects.filter(formation_id=self.kwargs["formation_id"])

    def perform_create(self, serializer):
        formation = get_object_or_404(Formation, pk=self.kwargs["formation_id"])
        serializer.save(formation=formation)


class ModuleDetailView(generics.RetrieveUpdateDestroyAPIView):
    """GET/PATCH/DELETE /api/formations/<formation_id>/modules/<pk>/"""

    serializer_class = ModuleSerializer
    permission_classes = [IsInstructorOrAdmin]

    def get_queryset(self):
        return Module.objects.filter(formation_id=self.kwargs["formation_id"])


# ============================================================
# Leçons — imbriquées sous un module (RF-009/RF-010)
# ============================================================


class LeconListCreateView(generics.ListCreateAPIView):
    """GET/POST /api/modules/<module_id>/lecons/"""

    serializer_class = LeconSerializer
    permission_classes = [IsInstructorOrAdmin]

    def get_queryset(self):
        return Lecon.objects.filter(module_id=self.kwargs["module_id"])

    def perform_create(self, serializer):
        module = get_object_or_404(Module, pk=self.kwargs["module_id"])
        serializer.save(module=module)


class LeconDetailView(generics.RetrieveUpdateDestroyAPIView):
    """GET/PATCH/DELETE /api/modules/<module_id>/lecons/<pk>/"""

    serializer_class = LeconSerializer
    permission_classes = [IsInstructorOrAdmin]

    def get_queryset(self):
        return Lecon.objects.filter(module_id=self.kwargs["module_id"])


# ============================================================
# Ressources — imbriquées sous une leçon (RF-010)
# ============================================================


class RessourceListCreateView(generics.ListCreateAPIView):
    """GET/POST /api/lecons/<lecon_id>/ressources/"""

    serializer_class = RessourceSerializer
    permission_classes = [IsInstructorOrAdmin]

    def get_queryset(self):
        return Ressource.objects.filter(lecon_id=self.kwargs["lecon_id"])

    def perform_create(self, serializer):
        lecon = get_object_or_404(Lecon, pk=self.kwargs["lecon_id"])
        serializer.save(lecon=lecon)


class RessourceDetailView(generics.RetrieveUpdateDestroyAPIView):
    """GET/PATCH/DELETE /api/lecons/<lecon_id>/ressources/<pk>/"""

    serializer_class = RessourceSerializer
    permission_classes = [IsInstructorOrAdmin]

    def get_queryset(self):
        return Ressource.objects.filter(lecon_id=self.kwargs["lecon_id"])


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
