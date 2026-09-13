from django.urls import path

from . import views

urlpatterns = [
    path("categories/", views.CategoryListCreateView.as_view(), name="category-list"),
    path("categories/<uuid:pk>/", views.CategoryDetailView.as_view(), name="category-detail"),
    path("formations/", views.FormationListCreateView.as_view(), name="formation-list"),
    path("formations/<uuid:pk>/", views.FormationDetailView.as_view(), name="formation-detail"),
    path("formations/<uuid:pk>/contenu/", views.FormationContenuView.as_view(), name="formation-contenu"),
    path("formations/<uuid:pk>/submit/", views.FormationSubmitView.as_view(), name="formation-submit"),
    path("formations/<uuid:pk>/validate/", views.FormationValidateView.as_view(), name="formation-validate"),
    path("formations/<uuid:pk>/refuse/", views.FormationRefuseView.as_view(), name="formation-refuse"),
    path("formations/<uuid:pk>/publish/", views.FormationPublishView.as_view(), name="formation-publish"),
    path("formations/<uuid:pk>/unpublish/", views.FormationUnpublishView.as_view(), name="formation-unpublish"),
    path("formations/<uuid:pk>/assigner/", views.FormationAssignerView.as_view(), name="formation-assigner"),
    path("formations/<uuid:formation_id>/modules/", views.ModuleListCreateView.as_view(), name="module-list"),
    path("formations/<uuid:formation_id>/modules/<uuid:pk>/", views.ModuleDetailView.as_view(), name="module-detail"),
    path("modules/<uuid:module_id>/lecons/", views.LeconListCreateView.as_view(), name="lecon-list"),
    path("modules/<uuid:module_id>/lecons/<uuid:pk>/", views.LeconDetailView.as_view(), name="lecon-detail"),
    path("lecons/videos/upload/", views.LeconVideoUploadView.as_view(), name="lecon-video-upload"),
    path("lecons/ressources/upload/", views.RessourceUploadView.as_view(), name="lecon-ressource-upload"),
    path("lecons/<uuid:lecon_id>/ressources/", views.RessourceListCreateView.as_view(), name="ressource-list"),
    path("lecons/<uuid:lecon_id>/ressources/<uuid:pk>/", views.RessourceDetailView.as_view(), name="ressource-detail"),
    path("catalogue/formations/", views.PublicFormationListView.as_view(), name="catalogue-list"),
    path("catalogue/formations/<uuid:pk>/", views.PublicFormationDetailView.as_view(), name="catalogue-detail"),
    path("catalogue/categories/", views.PublicCategoryListView.as_view(), name="catalogue-categories"),
]
