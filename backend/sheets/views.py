from rest_framework import generics
from rest_framework.permissions import IsAuthenticated

from core.utils import log_activity

from .models import Classeur
from .serializers import ClasseurListSerializer, ClasseurSerializer


class ClasseurListCreateView(generics.ListCreateAPIView):
    """GET /api/classeurs/ (liste, sans données) — POST /api/classeurs/.
    Chacun ne voit et ne manipule que ses propres classeurs."""

    permission_classes = [IsAuthenticated]

    def get_serializer_class(self):
        if self.request.method == "GET":
            return ClasseurListSerializer
        return ClasseurSerializer

    def get_queryset(self):
        return Classeur.objects.filter(proprietaire=self.request.user)

    def perform_create(self, serializer):
        classeur = serializer.save(proprietaire=self.request.user)
        log_activity(self.request.user, "CLASSEUR_CREATION", classeur.nom)


class ClasseurDetailView(generics.RetrieveUpdateDestroyAPIView):
    """GET/PATCH/DELETE /api/classeurs/<uuid>/ — restreint au propriétaire
    (le queryset filtré renvoie un 404 pour le classeur d'un autre)."""

    serializer_class = ClasseurSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Classeur.objects.filter(proprietaire=self.request.user)

    def perform_destroy(self, instance):
        log_activity(self.request.user, "CLASSEUR_SUPPRESSION", instance.nom)
        instance.delete()
