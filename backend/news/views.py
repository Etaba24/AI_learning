from rest_framework import generics
from rest_framework.permissions import IsAuthenticated

from accounts.permissions import IsAdmin
from core.utils import log_activity

from .models import Annonce
from .serializers import AnnonceSerializer


class PublicAnnonceListView(generics.ListAPIView):
    """GET /api/catalogue/annonces/ — lecture seule, ouverte à tout
    utilisateur connecté (page Actualités de l'espace apprenant)."""

    queryset = Annonce.objects.all()
    serializer_class = AnnonceSerializer
    permission_classes = [IsAuthenticated]


class AnnonceListCreateView(generics.ListCreateAPIView):
    """GET/POST /api/annonces/ — gestion réservée à l'administrateur."""

    queryset = Annonce.objects.all()
    serializer_class = AnnonceSerializer
    permission_classes = [IsAdmin]

    def perform_create(self, serializer):
        annonce = serializer.save(redacteur=self.request.user)
        log_activity(self.request.user, "ANNONCE_CREATION", annonce.titre)


class AnnonceDetailView(generics.RetrieveUpdateDestroyAPIView):
    """GET/PATCH/DELETE /api/annonces/<uuid>/ — réservé à l'administrateur."""

    queryset = Annonce.objects.all()
    serializer_class = AnnonceSerializer
    permission_classes = [IsAdmin]

    def perform_update(self, serializer):
        annonce = serializer.save()
        log_activity(self.request.user, "ANNONCE_MODIFICATION", annonce.titre)

    def perform_destroy(self, instance):
        log_activity(self.request.user, "ANNONCE_SUPPRESSION", instance.titre)
        instance.delete()
