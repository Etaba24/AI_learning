from django.urls import path

from . import views

urlpatterns = [
    path("documents/", views.DocumentListCreateView.as_view(), name="document-list"),
    path("documents/<uuid:pk>/", views.DocumentDetailView.as_view(), name="document-detail"),
    path("documents/<uuid:pk>/submit/", views.DocumentSubmitView.as_view(), name="document-submit"),
    path("documents/<uuid:pk>/validate/", views.DocumentValidateView.as_view(), name="document-validate"),
    path("documents/<uuid:pk>/refuse/", views.DocumentRefuseView.as_view(), name="document-refuse"),
    path("documents/<uuid:pk>/publish/", views.DocumentPublishView.as_view(), name="document-publish"),
    path("documents/<uuid:pk>/unpublish/", views.DocumentUnpublishView.as_view(), name="document-unpublish"),
    path("bibliotheque/documents/", views.PublicDocumentListView.as_view(), name="public-document-list"),
]
