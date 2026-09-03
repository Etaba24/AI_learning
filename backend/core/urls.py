from django.urls import path

from . import views

urlpatterns = [
    path("contact/", views.ContactMessageView.as_view(), name="contact"),
    path("admin/stats/", views.AdminStatsView.as_view(), name="admin-stats"),
    path("departements/", views.DepartementListCreateView.as_view(), name="departement-list"),
    path("departements/<uuid:pk>/", views.DepartementDetailView.as_view(), name="departement-detail"),
]
