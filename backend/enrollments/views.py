from django.shortcuts import get_object_or_404
from rest_framework import generics, status
from rest_framework.exceptions import PermissionDenied
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
        # Le « videur » : une formation premium exige un abonnement actif
        # (personnel ou via l'établissement du compte). Contrôle côté
        # serveur — masquer un bouton au frontend ne protège rien.
        formation = serializer.validated_data.get("formation")
        if formation and formation.est_premium:
            from billing.services import a_acces_premium
            from rest_framework.exceptions import PermissionDenied

            if not a_acces_premium(self.request.user):
                raise PermissionDenied(
                    "Cette formation est réservée aux abonnés. Souscrivez un abonnement pour y accéder."
                )
        serializer.save(apprenant=self.request.user)


class InscriptionDetailView(generics.RetrieveDestroyAPIView):
    """GET /api/inscriptions/<id>/ — Détails d'une inscription.
    DELETE /api/inscriptions/<id>/ — se désinscrire d'une formation."""

    serializer_class = InscriptionSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Inscription.objects.filter(apprenant=self.request.user).select_related("formation")


class ProgressionUpdateView(APIView):
    """POST /api/inscriptions/<inscription_id>/lecons/<lecon_id>/progress/
    Logique Métier RG-005 : une leçon est terminée si sa vidéo est vue à
    90%+. Réservé au suivi VIDÉO — un score de QCM ne passe jamais par ici :
    accepter un `score` tel quel envoyé par le client reviendrait à laisser
    n'importe qui valider n'importe quelle leçon d'un simple POST
    {"score": 100}, sans avoir répondu à la moindre question. La seule voie
    légitime pour un score de QCM est QuizSubmitView (assessments.views),
    qui le calcule lui-même côté serveur à partir des vraies réponses."""

    permission_classes = [IsAuthenticated]

    def post(self, request, inscription_id, lecon_id):
        inscription = get_object_or_404(Inscription, pk=inscription_id, apprenant=request.user)
        # La leçon doit appartenir à LA formation de cette inscription — sans
        # ce filtre, un apprenant pouvait faire progresser (et donc terminer)
        # une leçon d'une toute autre formation via son seul id.
        lecon = get_object_or_404(Lecon, pk=lecon_id, module__formation=inscription.formation)

        # RG-006 : impossible de valider une leçon encore verrouillée — sans
        # ça, poster directement la progression d'une leçon plus loin dans
        # le programme suffisait à en déverrouiller la suite sans jamais
        # avoir terminé les précédentes (le vrai contournement constaté ne
        # passait pas seulement par l'URL de FormationDetailPage, mais aussi
        # par cet endpoint, qui ne vérifiait rien).
        from enrollments.services import get_locked_lecon_ids, marquer_inscription_terminee_si_complete

        if lecon.id in get_locked_lecon_ids(inscription.formation, inscription):
            raise PermissionDenied("Cette leçon est verrouillée : terminez les leçons précédentes d'abord.")

        video_percent = int(request.data.get("video_progression_percent", 0))
        lu = bool(request.data.get("lu"))

        progression, _ = Progression.objects.get_or_create(
            inscription=inscription,
            lecon=lecon,
            defaults={"statut": Progression.Statut.EN_COURS}
        )
        progression.video_progression_percent = max(progression.video_progression_percent, video_percent)

        if lecon.quiz.exists():
            # Cette leçon a un QCM : seul QuizSubmitView (score calculé
            # côté serveur) a l'autorité pour la marquer Terminée — `lu`
            # est ignoré ici, sinon on contournerait le QCM en un POST.
            if progression.statut != Progression.Statut.TERMINEE:
                progression.statut = Progression.Statut.EN_COURS
        else:
            # Pas de QCM sur cette leçon : rien à contourner derrière un
            # `lu` (pas de bonne réponse à deviner), donc un simple
            # acquiescement de l'apprenant — ou 90%+ de la vidéo si elle en
            # a une — suffit à la valider.
            if lu or progression.video_progression_percent >= 90:
                progression.statut = Progression.Statut.TERMINEE
            elif progression.statut != Progression.Statut.TERMINEE:
                progression.statut = Progression.Statut.EN_COURS

        progression.save()

        marquer_inscription_terminee_si_complete(inscription, inscription.formation)

        return Response(ProgressionSerializer(progression).data, status=status.HTTP_200_OK)
