from django.conf import settings
from django.core.mail import send_mail
from django.db.models import ProtectedError
from rest_framework import generics, status
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.models import User
from accounts.permissions import IsAdmin, IsInstructorOrAdmin
from trainings.models import Formation

from .models import Departement, JournalActivite
from .serializers import ContactMessageSerializer, DepartementSerializer, JournalActiviteSerializer


class ContactMessageView(APIView):
    """POST /api/contact/ — formulaire "Nous contacter" de la page publique.
    Public (AllowAny) : un visiteur non connecté doit pouvoir l'utiliser."""

    permission_classes = [AllowAny]

    def post(self, request):
        serializer = ContactMessageSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        send_mail(
            subject=f"[AI Learning] Message de {data['name']}",
            message=f"De : {data['name']} <{data['email']}>\n\n{data['message']}",
            from_email=None,
            recipient_list=[settings.CONTACT_EMAIL],
        )

        return Response({"detail": "Votre message a bien été envoyé."})


class AdminStatsView(APIView):
    """GET /api/admin/stats/ — tableau de bord global (admin & formateurs)."""

    permission_classes = [IsInstructorOrAdmin]

    def get(self, request):
        return Response(
            {
                "users": {
                    "total": User.objects.count(),
                    "students": User.objects.filter(role=User.Role.STUDENT).count(),
                    "instructors": User.objects.filter(role=User.Role.INSTRUCTOR).count(),
                    "admins": User.objects.filter(role=User.Role.ADMIN).count(),
                },
                "formations": {
                    "total": Formation.objects.count(),
                    "brouillon": Formation.objects.filter(statut=Formation.Statut.BROUILLON).count(),
                    "soumise": Formation.objects.filter(statut=Formation.Statut.SOUMISE).count(),
                    "validee": Formation.objects.filter(statut=Formation.Statut.VALIDEE).count(),
                    "refusee": Formation.objects.filter(statut=Formation.Statut.REFUSEE).count(),
                    "publiee": Formation.objects.filter(statut=Formation.Statut.PUBLIEE).count(),
                    "depubliee": Formation.objects.filter(statut=Formation.Statut.DEPUBLIEE).count(),
                },
            }
        )


class ActivityJournalListView(generics.ListAPIView):
    """GET /api/admin/logs/ — journal d'activité réservé à l'admin."""

    queryset = JournalActivite.objects.select_related("utilisateur").all().order_by("-created_at")
    serializer_class = JournalActiviteSerializer
    permission_classes = [IsAdmin]


class DepartementListCreateView(generics.ListCreateAPIView):
    """Rattaché aux formateurs et aux formations."""

    queryset = Departement.objects.all()
    serializer_class = DepartementSerializer
    permission_classes = [IsInstructorOrAdmin]


class DepartementDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = Departement.objects.all()
    serializer_class = DepartementSerializer
    permission_classes = [IsInstructorOrAdmin]

    def destroy(self, request, *args, **kwargs):
        try:
            return super().destroy(request, *args, **kwargs)
        except ProtectedError:
            return Response(
                {"detail": "Ce département est utilisé par un formateur ou une formation, impossible de le supprimer."},
                status=status.HTTP_400_BAD_REQUEST,
            )
