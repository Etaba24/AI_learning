from django.urls import path

from . import views

urlpatterns = [
    path("classeurs/", views.ClasseurListCreateView.as_view(), name="classeur-list"),
    path("classeurs/<uuid:pk>/", views.ClasseurDetailView.as_view(), name="classeur-detail"),
]
