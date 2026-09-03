from django.contrib.auth.tokens import default_token_generator
from django.core.mail import send_mail
from django.db.models import ProtectedError
from django.utils.encoding import force_bytes, force_str
from django.utils.http import urlsafe_base64_decode, urlsafe_base64_encode
from rest_framework import generics, serializers, status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from core.utils import log_activity

from .models import User
from .permissions import IsAdmin, IsInstructorOrAdmin
from .serializers import (
    AdminUserSerializer,
    PasswordResetConfirmSerializer,
    PasswordResetRequestSerializer,
    RegisterSerializer,
    UserSerializer,
)


class RegisterView(generics.CreateAPIView):
    """POST /api/auth/register/ — RF-001. Public : pas besoin d'être
    connecté pour créer un compte, d'où AllowAny (qui écrase le réglage
    global IsAuthenticated de settings.py pour cette seule vue)."""

    queryset = User.objects.all()
    serializer_class = RegisterSerializer
    permission_classes = [AllowAny]


class MeView(generics.RetrieveUpdateAPIView):
    """GET/PATCH /api/users/me/ — RF-007. `get_object` renvoie toujours
    l'utilisateur connecté : impossible de consulter le profil de
    quelqu'un d'autre par ce endpoint."""

    serializer_class = UserSerializer
    permission_classes = [IsAuthenticated]

    def get_object(self):
        return self.request.user


class UserListView(generics.ListCreateAPIView):
    """GET /api/users/?role=STUDENT|INSTRUCTOR — accessible aux admins et formateurs."""

    permission_classes = [IsInstructorOrAdmin]

    def get_serializer_class(self):
        return RegisterSerializer if self.request.method == "POST" else AdminUserSerializer

    def get_queryset(self):
        queryset = User.objects.all().order_by("email")
        role = self.request.query_params.get("role")
        if role:
            queryset = queryset.filter(role=role)
        return queryset

    def perform_create(self, serializer):
        user = serializer.save()
        log_activity(self.request.user, "USER_CREATED", f"{user.email} ({user.role})")


class UserDetailView(generics.RetrieveUpdateDestroyAPIView):
    """GET/PATCH/DELETE /api/users/<id>/ — RF-005/RF-006 : modifier,
    désactiver (is_active via PATCH) ou supprimer un compte tiers."""

    queryset = User.objects.all()
    serializer_class = AdminUserSerializer
    permission_classes = [IsAdmin]

    def perform_update(self, serializer):
        if serializer.instance.pk == self.request.user.pk and "is_active" in serializer.validated_data:
            raise serializers.ValidationError("Impossible de désactiver son propre compte.")
        user = serializer.save()
        log_activity(self.request.user, "USER_UPDATED", user.email)

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        if instance.pk == request.user.pk:
            return Response(
                {"detail": "Impossible de supprimer son propre compte."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        email = instance.email
        try:
            self.perform_destroy(instance)
        except ProtectedError:
            return Response(
                {
                    "detail": "Ce compte est lié à des données existantes (formations, inscriptions...) "
                    "et ne peut pas être supprimé — désactivez-le à la place."
                },
                status=status.HTTP_400_BAD_REQUEST,
            )
        log_activity(request.user, "USER_DELETED", email)
        return Response(status=status.HTTP_204_NO_CONTENT)


class PasswordResetRequestView(APIView):
    """POST /api/auth/password-reset/ — RF-003, étape 1 : demande de lien.
    Répond toujours 200, même si l'email n'existe pas, pour ne pas révéler
    quels emails sont inscrits sur la plateforme (bonne pratique sécurité)."""

    permission_classes = [AllowAny]

    def post(self, request):
        serializer = PasswordResetRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        email = serializer.validated_data["email"]

        user = User.objects.filter(email__iexact=email).first()
        if user is not None:
            uid = urlsafe_base64_encode(force_bytes(user.pk))
            token = default_token_generator.make_token(user)
            send_mail(
                subject="Réinitialisation de votre mot de passe — AI Learning",
                message=(
                    "Voici les informations pour réinitialiser votre mot de passe :\n"
                    f"uid={uid}\ntoken={token}\n"
                    "(en dev, transmettez-les tels quels à /api/auth/password-reset-confirm/)"
                ),
                from_email=None,
                recipient_list=[user.email],
            )

        return Response(
            {"detail": "Si un compte existe avec cet email, un lien de réinitialisation a été envoyé."}
        )


class PasswordResetConfirmView(APIView):
    """POST /api/auth/password-reset-confirm/ — RF-003, étape 2 : le lien
    envoyé par email contient uid+token, qu'on vérifie ici avant de changer
    le mot de passe."""

    permission_classes = [AllowAny]

    def post(self, request):
        serializer = PasswordResetConfirmSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        try:
            uid = force_str(urlsafe_base64_decode(data["uid"]))
            user = User.objects.get(pk=uid)
        except (User.DoesNotExist, ValueError, TypeError, OverflowError):
            return Response({"detail": "Lien invalide."}, status=status.HTTP_400_BAD_REQUEST)

        if not default_token_generator.check_token(user, data["token"]):
            return Response({"detail": "Lien invalide ou expiré."}, status=status.HTTP_400_BAD_REQUEST)

        user.set_password(data["new_password"])
        user.save()
        return Response({"detail": "Mot de passe mis à jour."})
