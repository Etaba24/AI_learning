from django.urls import path
from . import views

urlpatterns = [
    path("certifications/", views.CertificationListAPIView.as_view(), name="certification-list"),
    path("certifications/verify/<uuid:identifiant_public>/", views.CertificationVerifyAPIView.as_view(), name="certification-verify"),
    path("inscriptions/<uuid:inscription_id>/generate-certificate/", views.CertificationGenerateAPIView.as_view(), name="certification-generate"),
]
