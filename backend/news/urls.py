from django.urls import path

from . import views

urlpatterns = [
    path("catalogue/annonces/", views.PublicAnnonceListView.as_view(), name="public-annonce-list"),
    path("annonces/", views.AnnonceListCreateView.as_view(), name="annonce-list"),
    path("annonces/<uuid:pk>/", views.AnnonceDetailView.as_view(), name="annonce-detail"),
]
