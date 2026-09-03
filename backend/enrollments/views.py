from django.shortcuts import get_object_or_404
from rest_framework import generics, status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from trainings.models import Lecon
from .models import Inscription, Progression
from .serializers import InscriptionSerializer, ProgressionSerializer


class InscriptionListCreateView(generics.ListCreateAPIView):
    """GET /api/inscriptions/ — "Mes formations" (RF-023 à RF-026).
    POST /api/inscriptions/ — s'inscrire à une formation (RF-022)."""

    serializer_class = InscriptionSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Inscription.objects.filter(apprenant=self.request.user).select_related("formation")

    def perform_create(self, serializer):
        serializer.save(apprenant=self.request.user)


class InscriptionDetailView(generics.RetrieveAPIView):
    """GET /api/inscriptions/<id>/ — Détails d'une inscription."""

    serializer_class = InscriptionSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Inscription.objects.filter(apprenant=self.request.user).select_related("formation")


class ProgressionUpdateView(APIView):
    """POST /api/inscriptions/<inscription_id>/lecons/<lecon_id>/progress/
    Logique Métier RG-005 : Une leçon est terminée si la vidéo est vue à 90%+ ou le quiz est réussi."""

    permission_classes = [IsAuthenticated]

    def post(self, request, inscription_id, lecon_id):
        inscription = get_object_or_404(Inscription, pk=inscription_id, apprenant=request.user)
        lecon = get_object_or_404(Lecon, pk=lecon_id)

        video_percent = int(request.data.get("video_progression_percent", 0))
        score = request.data.get("score")

        progression, _ = Progression.objects.get_or_create(
            inscription=inscription,
            lecon=lecon,
            defaults={"statut": Progression.Statut.EN_COURS}
        )

        progression.video_progression_percent = max(progression.video_progression_percent, video_percent)
        if score is not None:
            progression.score = float(score)

        # Logique Métier RG-005
        is_completed = False
        if progression.video_progression_percent >= 90:
            is_completed = True
        if score is not None and float(score) >= 70:
            is_completed = True

        if is_completed:
            progression.statut = Progression.Statut.TERMINEE
        else:
            progression.statut = Progression.Statut.EN_COURS

        progression.save()

        # Met à jour le statut global de l'inscription si toutes les leçons sont terminées
        total_lecons = Lecon.objects.filter(module__formation=inscription.formation).count()
        completed_count = Progression.objects.filter(inscription=inscription, statut=Progression.Statut.TERMINEE).count()

        if total_lecons > 0 and completed_count == total_lecons:
            inscription.statut = Inscription.Statut.TERMINEE
            inscription.save()

        return Response(ProgressionSerializer(progression).data, status=status.HTTP_200_OK)
