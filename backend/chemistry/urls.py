from django.urls import path

from . import views

urlpatterns = [
    path("chimie/molecule/", views.MoleculeSearchView.as_view(), name="chimie-molecule"),
]
