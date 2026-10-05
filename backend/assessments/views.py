from django.db.models import Q
from django.shortcuts import get_object_or_404
from rest_framework import generics, status
from rest_framework.exceptions import PermissionDenied
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.models import User
from accounts.permissions import IsInstructorOrAdmin
from trainings.models import Formation, Lecon, Module
from .models import Quiz, Question, Choice, Exercice
from .serializers import QuizSerializer, QuestionSerializer, ExerciceSerializer


def _formation_queryset_for(user):
    """Formations qu'un utilisateur a le droit de gérer — même filtre que
    trainings.views._formation_queryset_for, dupliqué ici volontairement
    (pas d'import inter-app de vue à vue) : toutes pour l'admin, seulement
    les siennes pour un formateur. Base de TOUT accès aux exercices/quiz
    ci-dessous — sans ça, un formateur peut lire/modifier/supprimer le
    contenu de n'importe quelle formation (cf. audit sécurité, IDOR)."""

    queryset = Formation.objects.all()
    if user.is_authenticated and user.role == User.Role.INSTRUCTOR:
        queryset = queryset.filter(auteur=user)
    return queryset


class ExerciceListCreateView(generics.ListCreateAPIView):
    """GET/POST /api/lecons/<lecon_id>/exercices/"""

    serializer_class = ExerciceSerializer
    permission_classes = [IsInstructorOrAdmin]

    def get_queryset(self):
        return Exercice.objects.filter(
            lecon_id=self.kwargs["lecon_id"],
            lecon__module__formation__in=_formation_queryset_for(self.request.user),
        )

    def perform_create(self, serializer):
        lecon = get_object_or_404(
            Lecon.objects.filter(module__formation__in=_formation_queryset_for(self.request.user)),
            pk=self.kwargs["lecon_id"],
        )
        serializer.save(lecon=lecon)


class ExerciceDetailView(generics.RetrieveUpdateDestroyAPIView):
    """GET/PATCH/DELETE /api/exercices/<pk>/"""

    serializer_class = ExerciceSerializer
    permission_classes = [IsInstructorOrAdmin]

    def get_queryset(self):
        return Exercice.objects.filter(lecon__module__formation__in=_formation_queryset_for(self.request.user))


class QuizListCreateView(generics.ListCreateAPIView):
    """GET/POST /api/lecons/<lecon_id>/quiz/"""

    serializer_class = QuizSerializer
    permission_classes = [IsInstructorOrAdmin]

    def get_queryset(self):
        return Quiz.objects.filter(
            lecon_id=self.kwargs["lecon_id"],
            lecon__module__formation__in=_formation_queryset_for(self.request.user),
        )

    def perform_create(self, serializer):
        lecon = get_object_or_404(
            Lecon.objects.filter(module__formation__in=_formation_queryset_for(self.request.user)),
            pk=self.kwargs["lecon_id"],
        )
        quiz = serializer.save(lecon=lecon)

        # Enregistrement des questions si fournies dans le body
        questions_data = self.request.data.get("questions", [])
        for q_idx, q_item in enumerate(questions_data):
            question = Question.objects.create(
                quiz=quiz,
                enonce=q_item.get("enonce", f"Question {q_idx + 1}"),
                ordre=q_idx + 1
            )
            choix_data = q_item.get("choix", [])
            for c_item in choix_data:
                Choice.objects.create(
                    question=question,
                    texte=c_item.get("texte", ""),
                    est_correcte=c_item.get("est_correcte", False)
                )


class QuizDetailView(generics.RetrieveUpdateDestroyAPIView):
    """GET/PATCH/DELETE /api/quiz/<pk>/"""

    serializer_class = QuizSerializer
    permission_classes = [IsInstructorOrAdmin]

    def get_queryset(self):
        formations = _formation_queryset_for(self.request.user)
        return Quiz.objects.filter(Q(lecon__module__formation__in=formations) | Q(module__formation__in=formations))


class QuizSubmitView(APIView):
    """POST /api/quiz/<quiz_id>/soumettre/ — RG-006 : un apprenant répond à
    un QCM rattaché à une leçon. Le score est calculé ICI, côté serveur, à
    partir des vraies bonnes réponses (jamais envoyées au client avant
    soumission — voir QuizPublicSerializer) : c'est la seule voie légitime
    pour faire progresser une leçon par QCM, contrairement à
    ProgressionUpdateView qui accepterait sinon un score inventé de toutes
    pièces par le client."""

    permission_classes = [IsAuthenticated]

    def post(self, request, quiz_id):
        quiz = get_object_or_404(
            Quiz.objects.select_related("lecon__module__formation").prefetch_related("questions__choix"),
            pk=quiz_id,
        )
        if not quiz.lecon_id:
            return Response(
                {"detail": "Ce quiz n'est pas rattaché à une leçon."}, status=status.HTTP_400_BAD_REQUEST
            )

        lecon = quiz.lecon
        formation = lecon.module.formation

        from enrollments.models import Inscription, Progression
        from enrollments.services import get_locked_lecon_ids, marquer_inscription_terminee_si_complete

        inscription = Inscription.objects.filter(apprenant=request.user, formation=formation).first()
        if inscription is None:
            raise PermissionDenied("Vous devez être inscrit à cette formation pour répondre à ce quiz.")

        if lecon.id in get_locked_lecon_ids(formation, inscription):
            raise PermissionDenied("Cette leçon est verrouillée : terminez les leçons précédentes d'abord.")

        questions = list(quiz.questions.all())
        if not questions:
            return Response({"detail": "Ce quiz n'a aucune question."}, status=status.HTTP_400_BAD_REQUEST)

        reponses = request.data.get("reponses") or {}
        if not isinstance(reponses, dict):
            return Response({"detail": "Format de réponses invalide."}, status=status.HTTP_400_BAD_REQUEST)

        correct_count = 0
        correction = {}
        for question in questions:
            bonne_choix = next((c for c in question.choix.all() if c.est_correcte), None)
            correction[str(question.id)] = str(bonne_choix.id) if bonne_choix else None
            reponse_donnee = str(reponses.get(str(question.id), ""))
            if bonne_choix and reponse_donnee == str(bonne_choix.id):
                correct_count += 1

        score = round(correct_count / len(questions) * 100)
        reussi = score >= quiz.seuil_reussite

        progression, _ = Progression.objects.get_or_create(
            inscription=inscription, lecon=lecon, defaults={"statut": Progression.Statut.EN_COURS}
        )
        progression.score = score
        # Un score raté ne fait jamais régresser un statut déjà acquis par
        # ailleurs (ex: vidéo déjà vue à 90%+) — seule une réussite peut
        # faire progresser, jamais une tentative ratée faire reculer.
        if reussi:
            progression.statut = Progression.Statut.TERMINEE
        progression.save()

        marquer_inscription_terminee_si_complete(inscription, formation)

        return Response(
            {
                "score": score,
                "seuil_reussite": quiz.seuil_reussite,
                "reussi": reussi,
                "correction": correction,
            }
        )
