from django.urls import path

from . import views

urlpatterns = [
    path("cartes/", views.CarteListCreateView.as_view(), name="carte-list"),
    path("cartes/<uuid:pk>/", views.CarteDetailView.as_view(), name="carte-detail"),
]
