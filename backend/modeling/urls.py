from django.urls import path

from . import views

urlpatterns = [
    path("scenes3d/", views.Scene3DListCreateView.as_view(), name="scene3d-list"),
    path("scenes3d/<uuid:pk>/", views.Scene3DDetailView.as_view(), name="scene3d-detail"),
]
