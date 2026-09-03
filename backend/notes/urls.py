from django.urls import path

from . import views

urlpatterns = [
    path("notes/", views.NoteListCreateView.as_view(), name="note-list"),
    path("notes/<uuid:pk>/", views.NoteDetailView.as_view(), name="note-detail"),
]
