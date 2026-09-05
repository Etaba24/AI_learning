from django.urls import path

from . import views

urlpatterns = [
    path("etablissements/", views.EtablissementListCreateView.as_view(), name="etablissement-list"),
    path("etablissements/<uuid:pk>/", views.EtablissementDetailView.as_view(), name="etablissement-detail"),
    path(
        "etablissements/<uuid:pk>/code-responsable/",
        views.EtablissementCodeResponsableView.as_view(),
        name="etablissement-code-responsable",
    ),
    path("plans/", views.PlanListCreateView.as_view(), name="plan-list"),
    path("plans/publics/", views.PlanPublicListView.as_view(), name="plan-public-list"),
    path("plans/<uuid:pk>/", views.PlanDetailView.as_view(), name="plan-detail"),
    path("abonnements/", views.AbonnementListCreateView.as_view(), name="abonnement-list"),
    path("abonnements/apprenants/", views.ApprenantsAbonnementView.as_view(), name="abonnement-apprenants"),
    path(
        "abonnements/apprenants/<uuid:user_id>/activer/",
        views.ActiverPremiumView.as_view(),
        name="abonnement-activer-premium",
    ),
    path("abonnements/<uuid:pk>/", views.AbonnementDetailView.as_view(), name="abonnement-detail"),
    path("abonnements/<uuid:pk>/annuler/", views.AbonnementAnnulerView.as_view(), name="abonnement-annuler"),
    path("mon-abonnement/", views.MonAbonnementView.as_view(), name="mon-abonnement"),
    path(
        "mon-abonnement/retrograder/",
        views.RetrograderAbonnementView.as_view(),
        name="mon-abonnement-retrograder",
    ),
    path("etablissement/moi/", views.EtablissementMoiView.as_view(), name="etablissement-moi"),
    path("etablissement/membres/", views.EtablissementMembresView.as_view(), name="etablissement-membres"),
    path(
        "etablissement/membres/<uuid:pk>/",
        views.EtablissementMembreDetailView.as_view(),
        name="etablissement-membre-detail",
    ),
    path("etablissement/filieres/", views.FiliereListCreateView.as_view(), name="etablissement-filiere-list"),
    path(
        "etablissement/filieres/<uuid:pk>/",
        views.FiliereDetailView.as_view(),
        name="etablissement-filiere-detail",
    ),
    path("etablissement/classes/", views.ClasseListCreateView.as_view(), name="etablissement-classe-list"),
    path(
        "etablissement/classes/<uuid:pk>/",
        views.ClasseDetailView.as_view(),
        name="etablissement-classe-detail",
    ),
    path(
        "etablissement/apprenants/importer/",
        views.EtablissementImportApprenantsView.as_view(),
        name="etablissement-import-apprenants",
    ),
]
