from rest_framework import generics
from rest_framework.permissions import IsAuthenticated

from core.utils import log_activity

from .models import Tableau
from .serializers import TableauListSerializer, TableauSerializer


class TableauListCreateView(generics.ListCreateAPIView):
    """GET /api/tableaux/ (liste, sans scène) — POST /api/tableaux/.
    Chacun ne voit et ne manipule que ses propres tableaux."""

    permission_classes = [IsAuthenticated]

    def get_serializer_class(self):
        if self.request.method == "GET":
            return TableauListSerializer
        return TableauSerializer

    def get_queryset(self):
        return Tableau.objects.filter(proprietaire=self.request.user)

    def perform_create(self, serializer):
        tableau = serializer.save(proprietaire=self.request.user)
        log_activity(self.request.user, "TABLEAU_CREATION", tableau.nom)


class TableauDetailView(generics.RetrieveUpdateDestroyAPIView):
    """GET/PATCH/DELETE /api/tableaux/<uuid>/ — restreint au propriétaire."""

    serializer_class = TableauSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Tableau.objects.filter(proprietaire=self.request.user)

    def perform_destroy(self, instance):
        log_activity(self.request.user, "TABLEAU_SUPPRESSION", instance.nom)
        instance.delete()
