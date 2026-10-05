from rest_framework import generics
from rest_framework.permissions import IsAuthenticated

from billing.permissions import HasToolAccess
from trainings.models import Outil

from core.utils import log_activity

from .models import Carte
from .serializers import CarteListSerializer, CarteSerializer


class CarteListCreateView(generics.ListCreateAPIView):
    """GET /api/cartes/ (liste, sans elements) — POST /api/cartes/.
    Chacun ne voit et ne manipule que ses propres cartes."""

    permission_classes = [IsAuthenticated, HasToolAccess]
    outil_code = Outil.Code.CARTOGRAPHIE

    def get_serializer_class(self):
        if self.request.method == "GET":
            return CarteListSerializer
        return CarteSerializer

    def get_queryset(self):
        return Carte.objects.filter(proprietaire=self.request.user)

    def perform_create(self, serializer):
        carte = serializer.save(proprietaire=self.request.user)
        log_activity(self.request.user, "CARTE_CREATION", carte.nom)


class CarteDetailView(generics.RetrieveUpdateDestroyAPIView):
    """GET/PATCH/DELETE /api/cartes/<uuid>/ — restreint au propriétaire."""

    serializer_class = CarteSerializer
    permission_classes = [IsAuthenticated, HasToolAccess]
    outil_code = Outil.Code.CARTOGRAPHIE

    def get_queryset(self):
        return Carte.objects.filter(proprietaire=self.request.user)

    def perform_destroy(self, instance):
        log_activity(self.request.user, "CARTE_SUPPRESSION", instance.nom)
        instance.delete()
