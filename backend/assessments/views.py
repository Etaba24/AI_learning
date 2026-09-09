from django.db.models import Q
from django.shortcuts import get_object_or_404
from rest_framework import generics, status
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
