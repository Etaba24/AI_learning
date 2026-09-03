from django.shortcuts import get_object_or_404
from rest_framework import generics, status
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.permissions import IsInstructorOrAdmin
from trainings.models import Lecon, Module
from .models import Quiz, Question, Choice, Exercice
from .serializers import QuizSerializer, QuestionSerializer, ExerciceSerializer


class ExerciceListCreateView(generics.ListCreateAPIView):
    """GET/POST /api/lecons/<lecon_id>/exercices/"""

    serializer_class = ExerciceSerializer
    permission_classes = [IsInstructorOrAdmin]

    def get_queryset(self):
        return Exercice.objects.filter(lecon_id=self.kwargs["lecon_id"])

    def perform_create(self, serializer):
        lecon = get_object_or_404(Lecon, pk=self.kwargs["lecon_id"])
        serializer.save(lecon=lecon)


class ExerciceDetailView(generics.RetrieveUpdateDestroyAPIView):
    """GET/PATCH/DELETE /api/exercices/<pk>/"""

    queryset = Exercice.objects.all()
    serializer_class = ExerciceSerializer
    permission_classes = [IsInstructorOrAdmin]


class QuizListCreateView(generics.ListCreateAPIView):
    """GET/POST /api/lecons/<lecon_id>/quiz/"""

    serializer_class = QuizSerializer
    permission_classes = [IsInstructorOrAdmin]

    def get_queryset(self):
        return Quiz.objects.filter(lecon_id=self.kwargs["lecon_id"])

    def perform_create(self, serializer):
        lecon = get_object_or_404(Lecon, pk=self.kwargs["lecon_id"])
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

    queryset = Quiz.objects.all()
    serializer_class = QuizSerializer
    permission_classes = [IsInstructorOrAdmin]
