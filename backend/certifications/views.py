from django.shortcuts import get_object_or_404
from rest_framework import generics, status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from enrollments.models import Inscription, Progression
from .models import Certification
from .serializers import CertificationSerializer


class CertificationListAPIView(generics.ListAPIView):
    """GET /api/certifications/ — Liste des certifications de l'utilisateur connecté."""

    serializer_class = CertificationSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Certification.objects.filter(apprenant=self.request.user).select_related(
            "formation", "formation__auteur", "apprenant"
        )


class CertificationVerifyAPIView(APIView):
    """GET /api/certifications/verify/<identifiant_public>/ — Vérification publique d'un certificat (RG-008)."""

    permission_classes = [AllowAny]

    def get(self, request, identifiant_public):
        certif = get_object_or_404(
            Certification.objects.select_related("formation", "formation__auteur", "apprenant"),
            identifiant_public=identifiant_public,
        )
        return Response({
            "valide": True,
            "identifiant_public": str(certif.identifiant_public),
            "apprenant": f"{certif.apprenant.first_name} {certif.apprenant.last_name}".strip() or certif.apprenant.email,
            "formation_titre": certif.formation.titre,
            "auteur": f"{certif.formation.auteur.first_name} {certif.formation.auteur.last_name}".strip() or certif.formation.auteur.email,
            "date_obtention": certif.created_at,
        })


class CertificationGenerateAPIView(APIView):
    """POST /api/inscriptions/<inscription_id>/generate-certificate/ — Logique Métier RG-007 en Python."""

    permission_classes = [IsAuthenticated]

    def post(self, request, inscription_id):
        inscription = get_object_or_404(Inscription, pk=inscription_id, apprenant=request.user)

        # Vérification si la certification existe déjà
        existing = Certification.objects.filter(apprenant=request.user, formation=inscription.formation).first()
        if existing:
            return Response(CertificationSerializer(existing).data, status=status.HTTP_200_OK)

        # Calcul métier Python des leçons complétées (RG-007)
        total_lecons = sum(mod.lecons.count() for mod in inscription.formation.modules.all())
        completed_progressions = Progression.objects.filter(
            inscription=inscription, statut=Progression.Statut.TERMINEE
        ).count()

        if total_lecons > 0 and completed_progressions < total_lecons:
            return Response(
                {"detail": f"RG-007 : La formation n'est complétée qu'à {completed_progressions}/{total_lecons} leçons."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        certif = Certification.objects.create(
            apprenant=request.user,
            formation=inscription.formation,
        )

        inscription.statut = Inscription.Statut.TERMINEE
        inscription.save()

        return Response(CertificationSerializer(certif).data, status=status.HTTP_201_CREATED)
