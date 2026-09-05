from django.db.models import Q
from django.shortcuts import get_object_or_404
from rest_framework import generics, status
from rest_framework.parsers import FormParser, MultiPartParser
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.models import User
from accounts.permissions import IsAdmin, IsInstructorOrAdmin
from core.utils import log_activity

from .models import Document
from .serializers import DocumentSerializer


class DocumentListCreateView(generics.ListCreateAPIView):
    """GET/POST /api/documents/ — espace de gestion formateur/admin. Un
    formateur ne voit et ne modifie que ses propres dépôts (comme pour les
    formations) ; l'admin voit tout, pour la modération."""

    serializer_class = DocumentSerializer
    permission_classes = [IsInstructorOrAdmin]
    parser_classes = [MultiPartParser, FormParser]

    def get_queryset(self):
        queryset = Document.objects.select_related("categorie", "auteur").all()
        if self.request.user.role == User.Role.INSTRUCTOR:
            queryset = queryset.filter(auteur=self.request.user)
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
        fichier = serializer.validated_data["fichier"]
        document = serializer.save(auteur=self.request.user, taille_octets=fichier.size)
        log_activity(self.request.user, "DOCUMENT_CREATION", document.titre)


class DocumentDetailView(generics.RetrieveUpdateDestroyAPIView):
    """GET/PATCH/DELETE /api/documents/<id>/ — modifie uniquement les
    métadonnées (jamais le statut, RG même principe que Formation)."""

    serializer_class = DocumentSerializer
    permission_classes = [IsInstructorOrAdmin]
    parser_classes = [MultiPartParser, FormParser]

    def get_queryset(self):
        queryset = Document.objects.select_related("categorie", "auteur").all()
        if self.request.user.role == User.Role.INSTRUCTOR:
            queryset = queryset.filter(auteur=self.request.user)
        return queryset

    def perform_update(self, serializer):
        extra = {}
        fichier = serializer.validated_data.get("fichier")
        if fichier:
            extra["taille_octets"] = fichier.size
        document = serializer.save(**extra)
        log_activity(self.request.user, "DOCUMENT_MODIFIE", document.titre)

    def perform_destroy(self, instance):
        log_activity(self.request.user, "DOCUMENT_SUPPRIME", instance.titre)
        instance.delete()


class _DocumentTransitionView(APIView):
    """Vue de base pour une transition de statut (soumission, dépublication)
    — vérifie que l'auteur agit bien sur son propre document, que le
    document est dans le bon statut de départ, et journalise l'action."""

    permission_classes = [IsInstructorOrAdmin]
    expected_status = None
    next_status = None
    action_label = None

    def get_error_message(self):
        return f"Cette action nécessite un document au statut « {self.expected_status.label} »."

    def post(self, request, pk):
        document = get_object_or_404(Document, pk=pk)
        if request.user.role == User.Role.INSTRUCTOR and document.auteur != request.user:
            return Response(
                {"detail": "Vous n'avez pas la permission de modifier ce document."},
                status=status.HTTP_403_FORBIDDEN,
            )
        if document.statut != self.expected_status:
            return Response({"detail": self.get_error_message()}, status=status.HTTP_400_BAD_REQUEST)
        document.statut = self.next_status
        document.save()
        log_activity(request.user, self.action_label, document.titre)
        return Response(DocumentSerializer(document).data)


class DocumentSubmitView(_DocumentTransitionView):
    """POST /api/documents/<id>/submit/ — BROUILLON -> SOUMIS."""

    expected_status = Document.Statut.BROUILLON
    next_status = Document.Statut.SOUMIS
    action_label = "DOCUMENT_SOUMIS"


class DocumentValidateView(_DocumentTransitionView):
    """POST /api/documents/<id>/validate/ — SOUMIS -> VALIDE. Réservé à
    l'administrateur, jamais le formateur lui-même (même principe que
    FormationValidateView)."""

    permission_classes = [IsAdmin]
    expected_status = Document.Statut.SOUMIS
    next_status = Document.Statut.VALIDE
    action_label = "DOCUMENT_VALIDE"

    def post(self, request, pk):
        document = get_object_or_404(Document, pk=pk)
        if document.statut != self.expected_status:
            return Response({"detail": self.get_error_message()}, status=status.HTTP_400_BAD_REQUEST)
        document.statut = self.next_status
        document.motif_refus = ""
        document.save()
        log_activity(request.user, self.action_label, document.titre)
        return Response(DocumentSerializer(document).data)


class DocumentRefuseView(_DocumentTransitionView):
    """POST /api/documents/<id>/refuse/ — SOUMIS -> REFUSE, motif requis.
    Réservé à l'administrateur."""

    permission_classes = [IsAdmin]
    expected_status = Document.Statut.SOUMIS
    next_status = Document.Statut.REFUSE
    action_label = "DOCUMENT_REFUSE"

    def post(self, request, pk):
        motif = (request.data.get("motif") or "").strip()
        if not motif:
            return Response({"detail": "Un motif de refus est requis."}, status=status.HTTP_400_BAD_REQUEST)
        document = get_object_or_404(Document, pk=pk)
        if document.statut != self.expected_status:
            return Response({"detail": self.get_error_message()}, status=status.HTTP_400_BAD_REQUEST)
        document.statut = self.next_status
        document.motif_refus = motif
        document.save()
        log_activity(request.user, self.action_label, f"{document.titre} : {motif}")
        return Response(DocumentSerializer(document).data)


class DocumentPublishView(APIView):
    """POST /api/documents/<id>/publish/ — BROUILLON ou VALIDE -> PUBLIE.
    Un formateur ne peut publier que son propre document, et seulement une
    fois validé ; l'admin peut publier directement (même logique que
    FormationPublishView)."""

    permission_classes = [IsInstructorOrAdmin]

    def post(self, request, pk):
        document = get_object_or_404(Document, pk=pk)
        if request.user.role == User.Role.INSTRUCTOR:
            if document.auteur != request.user:
                return Response(
                    {"detail": "Vous n'avez pas la permission de publier ce document."},
                    status=status.HTTP_403_FORBIDDEN,
                )
            if document.statut != Document.Statut.VALIDE:
                return Response(
                    {"detail": "Votre document doit d'abord être validé par un administrateur avant de pouvoir être publié."},
                    status=status.HTTP_400_BAD_REQUEST,
                )
        elif document.statut not in (Document.Statut.BROUILLON, Document.Statut.VALIDE):
            return Response(
                {"detail": "Seul un document en brouillon ou validé peut être publié."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        document.statut = Document.Statut.PUBLIE
        document.save()
        log_activity(request.user, "DOCUMENT_PUBLIE", document.titre)
        return Response(DocumentSerializer(document).data)


class DocumentUnpublishView(_DocumentTransitionView):
    """POST /api/documents/<id>/unpublish/ — PUBLIE -> DEPUBLIE."""

    expected_status = Document.Statut.PUBLIE
    next_status = Document.Statut.DEPUBLIE
    action_label = "DOCUMENT_DEPUBLIE"


class PublicDocumentListView(generics.ListAPIView):
    """GET /api/bibliotheque/documents/?q=...&categorie=<id>&format=PDF —
    bibliothèque consultée par les apprenants : uniquement les documents
    publiés, jamais un brouillon/soumis/refusé d'un autre utilisateur."""

    serializer_class = DocumentSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        queryset = Document.objects.filter(statut=Document.Statut.PUBLIE).select_related("categorie", "auteur")

        categorie = self.request.query_params.get("categorie")
        if categorie:
            queryset = queryset.filter(categorie_id=categorie)

        format_doc = self.request.query_params.get("format")
        if format_doc:
            queryset = queryset.filter(format=format_doc)

        q = self.request.query_params.get("q")
        if q:
            queryset = queryset.filter(Q(titre__icontains=q) | Q(description__icontains=q))

        return queryset
