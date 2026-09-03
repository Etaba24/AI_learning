from django.urls import path
from . import views

urlpatterns = [
    path("lecons/<uuid:lecon_id>/exercices/", views.ExerciceListCreateView.as_view(), name="exercice-list"),
    path("exercices/<uuid:pk>/", views.ExerciceDetailView.as_view(), name="exercice-detail"),
    path("lecons/<uuid:lecon_id>/quiz/", views.QuizListCreateView.as_view(), name="quiz-list"),
    path("quiz/<uuid:pk>/", views.QuizDetailView.as_view(), name="quiz-detail"),
]
