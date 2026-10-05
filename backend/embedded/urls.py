from django.urls import path

from . import views

urlpatterns = [
    path("sketches/", views.SketchListCreateView.as_view(), name="sketch-list"),
    path("sketches/<uuid:pk>/", views.SketchDetailView.as_view(), name="sketch-detail"),
]
