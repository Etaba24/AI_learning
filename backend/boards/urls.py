from django.urls import path

from . import views

urlpatterns = [
    path("tableaux/", views.TableauListCreateView.as_view(), name="tableau-list"),
    path("tableaux/<uuid:pk>/", views.TableauDetailView.as_view(), name="tableau-detail"),
]
