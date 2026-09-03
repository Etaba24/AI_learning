from django.urls import path
from . import views

urlpatterns = [
    path("inscriptions/", views.InscriptionListCreateView.as_view(), name="inscription-list"),
    path("inscriptions/<uuid:pk>/", views.InscriptionDetailView.as_view(), name="inscription-detail"),
    path("inscriptions/<uuid:inscription_id>/lecons/<uuid:lecon_id>/progress/", views.ProgressionUpdateView.as_view(), name="progression-update"),
]
