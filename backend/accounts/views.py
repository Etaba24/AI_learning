import json
import random
import secrets
import urllib.error
import urllib.request
from datetime import timedelta

from django.conf import settings
from django.contrib.auth.tokens import default_token_generator
from django.core.cache import cache
from django.core.mail import send_mail
from django.db.models import ProtectedError
from django.utils import timezone
from django.utils.encoding import force_bytes, force_str
from django.utils.http import urlsafe_base64_decode, urlsafe_base64_encode
from rest_framework import generics, serializers, status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.views import TokenObtainPairView

from billing.models import Abonnement
from billing.serializers import RejoindreEtablissementSerializer
from core.utils import log_activity

from .models import GoogleVerificationCode, User
from .permissions import IsAdmin, IsInstructorOrAdmin
from .serializers import (
    AdminUserSerializer,
    GoogleAuthSerializer,
    GoogleConfirmSerializer,
    PasswordChangeSerializer,
    PasswordResetConfirmSerializer,
    PasswordResetRequestSerializer,
    RegisterSerializer,
    UserSerializer,
)

GOOGLE_TOKENINFO_URL = "https://oauth2.googleapis.com/tokeninfo"


def _verify_google_credential(credential):
    """Vérifie le jeton d'identité Google auprès de Google lui-même (jamais
    décodé "à l'aveugle" côté serveur) : renvoie les infos du compte si
    valide, sinon None. `aud` doit correspondre à NOTRE client Google —
    sinon n'importe quel jeton Google valide d'une autre appli serait accepté."""

    url = f"{GOOGLE_TOKENINFO_URL}?id_token={credential}"
    try:
        with urllib.request.urlopen(url, timeout=10) as resp:
            data = json.loads(resp.read().decode("utf-8"))
    except (urllib.error.HTTPError, urllib.error.URLError, TimeoutError, ValueError):
        return None

    if not settings.GOOGLE_CLIENT_ID or data.get("aud") != settings.GOOGLE_CLIENT_ID:
        return None
    if data.get("email_verified") != "true":
        return None
    if data.get("iss") not in ("accounts.google.com", "https://accounts.google.com"):
        return None
    return data


class RegisterView(generics.CreateAPIView):
    """POST /api/auth/register/ — RF-001. Public : pas besoin d'être
    connecté pour créer un compte, d'où AllowAny (qui écrase le réglage
    global IsAuthenticated de settings.py pour cette seule vue)."""

    queryset = User.objects.all()
    serializer_class = RegisterSerializer
    permission_classes = [AllowAny]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = 'register'


class LoginView(TokenObtainPairView):
    """Connexion avec journalisation d'audit et limitation de débit (audit
    sécurité : sans ça, un mot de passe est devinable par force brute sans
    aucune limite)."""

    throttle_classes = [ScopedRateThrottle]
    throttle_scope = 'login'

    def post(self, request, *args, **kwargs):
        response = super().post(request, *args, **kwargs)
        if response.status_code == status.HTTP_200_OK:
            email = (request.data.get("email") or "").strip()
            if email:
                user = User.objects.filter(email__iexact=email).first()
                if user and user.is_active:
                    log_activity(user, "LOGIN", user.email)
        return response


class LogoutView(APIView):
    """Déconnexion avec blacklist du refresh token et journal d'audit."""

    permission_classes = [IsAuthenticated]

    def post(self, request):
        refresh_token = request.data.get("refresh")
        if refresh_token:
            try:
                RefreshToken(refresh_token).blacklist()
            except Exception:
                pass
        log_activity(request.user, "LOGOUT", request.user.email)
        return Response({"detail": "Déconnexion réussie."})


class WebSocketTicketView(APIView):
    """POST /api/auth/ws-ticket/ — jeton à usage unique, valable quelques
    secondes, à passer en `?ticket=` lors du handshake WebSocket (voir
    core/middleware.py). Remplace la réutilisation directe du jeton JWT
    d'accès dans l'URL : un navigateur ne peut pas fixer d'en-tête
    Authorization sur une requête WebSocket, donc CE jeton-ci finit
    nécessairement dans la query string — et une query string peut se
    retrouver dans des logs d'accès serveur/proxy. Un JWT d'accès complet
    qui y fuiterait resterait exploitable jusqu'à 30 minutes ; un ticket
    consommé une seule fois et expiré en quelques secondes n'offre plus
    rien à un attaquant qui lirait ce log après coup."""

    permission_classes = [IsAuthenticated]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = 'ws_ticket'

    TTL_SECONDES = 30

    def post(self, request):
        ticket = secrets.token_urlsafe(32)
        cache.set(f"ws_ticket:{ticket}", str(request.user.pk), timeout=self.TTL_SECONDES)
        return Response({"ticket": ticket, "expires_in": self.TTL_SECONDES})


class GoogleAuthView(APIView):
    """POST /api/auth/google/ — point d'entrée unique du bouton "Continuer
    avec Google", connexion et inscription confondues :
      - compte déjà existant (par google_id ou par email) -> connexion
        immédiate, jetons renvoyés directement (comme /auth/login/).
      - email inconnu -> pas de compte créé tout de suite : un code à 4
        chiffres est envoyé par email, à confirmer via GoogleConfirmView."""

    permission_classes = [AllowAny]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = 'register'

    def post(self, request):
        serializer = GoogleAuthSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        if not settings.GOOGLE_CLIENT_ID:
            return Response(
                {"detail": "La connexion Google n'est pas encore configurée côté serveur."},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )

        google_data = _verify_google_credential(serializer.validated_data["credential"])
        if google_data is None:
            return Response({"detail": "Jeton Google invalide ou expiré."}, status=status.HTTP_401_UNAUTHORIZED)

        google_id = google_data["sub"]
        email = google_data["email"]

        user = User.objects.filter(google_id=google_id).first() or User.objects.filter(email__iexact=email).first()

        if user is not None:
            if not user.is_active:
                return Response({"detail": "Ce compte a été désactivé."}, status=status.HTTP_403_FORBIDDEN)
            # Compte créé par mot de passe puis reconnu ici par email :
            # on le rattache à ce compte Google pour la prochaine fois.
            if not user.google_id:
                user.google_id = google_id
                user.save(update_fields=["google_id"])
            refresh = RefreshToken.for_user(user)
            log_activity(user, "GOOGLE_LOGIN")
            return Response(
                {"status": "logged_in", "access": str(refresh.access_token), "refresh": str(refresh)}
            )

        # Nouveau compte : code de vérification à 4 chiffres avant création.
        code = f"{random.randint(0, 9999):04d}"
        GoogleVerificationCode.objects.filter(email__iexact=email).delete()
        GoogleVerificationCode.objects.create(
            google_id=google_id,
            email=email,
            first_name=google_data.get("given_name", ""),
            last_name=google_data.get("family_name", ""),
            code=code,
            expires_at=timezone.now() + timedelta(minutes=10),
        )
        send_mail(
            subject="Votre code de vérification — AI Learning",
            message=(
                f"Voici votre code de vérification pour créer votre compte AI Learning : {code}\n"
                "Ce code expire dans 10 minutes."
            ),
            from_email=None,
            recipient_list=[email],
        )
        return Response({"status": "verification_required", "email": email})


class GoogleConfirmView(APIView):
    """POST /api/auth/google/confirm/ — 2e étape de l'inscription Google :
    le compte n'existe qu'à partir d'ici, une fois le code confirmé.

    Limitation de débit STRICTE (audit sécurité) : le code n'a que 10 000
    combinaisons (4 chiffres) — sans throttle, une attaque automatisée les
    épuise en quelques secondes et peut détourner la création de compte
    d'un email victime. À 5/min, le budget de tentatives est épuisé bien
    avant les 10 000 essais nécessaires, largement au-delà des 10 min de
    validité du code."""

    permission_classes = [AllowAny]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = 'google_confirm'

    def post(self, request):
        serializer = GoogleConfirmSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        email = serializer.validated_data["email"]
        code = serializer.validated_data["code"]

        pending = GoogleVerificationCode.objects.filter(email__iexact=email, consumed=False).first()
        if pending is None or pending.expires_at < timezone.now():
            return Response(
                {"detail": "Code expiré ou introuvable — recommencez avec le bouton Google."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if pending.code != code:
            return Response({"code": ["Code de vérification incorrect."]}, status=status.HTTP_400_BAD_REQUEST)

        if User.objects.filter(email__iexact=email).exists():
            return Response(
                {"detail": "Un compte existe déjà avec cet email — connectez-vous plutôt."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        user = User.objects.create_user(
            email=pending.email,
            password=None,  # compte Google uniquement : mot de passe inutilisable
            first_name=pending.first_name,
            last_name=pending.last_name,
            role=User.Role.STUDENT,
            google_id=pending.google_id,
        )
        pending.consumed = True
        pending.save(update_fields=["consumed"])

        refresh = RefreshToken.for_user(user)
        log_activity(user, "GOOGLE_REGISTER")
        return Response(
            {"access": str(refresh.access_token), "refresh": str(refresh)}, status=status.HTTP_201_CREATED
        )


class RejoindreEtablissementView(APIView):
    """POST /api/auth/etablissement/rejoindre/ — 2e moitié du parcours
    "code responsable" (le platform admin en génère un depuis la fiche de
    l'établissement, cf. billing.EtablissementCodeResponsableView) : crée
    directement le compte ETABLISSEMENT_ADMIN et connecte, en un seul geste
    — le responsable n'a en général pas encore de compte à ce stade."""

    permission_classes = [AllowAny]

    def post(self, request):
        serializer = RejoindreEtablissementSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        # validate_code a déjà transformé la chaîne en l'objet ResponsableInvitationCode.
        pending_code = serializer.validated_data["code"]

        user = User.objects.create_user(
            email=serializer.validated_data["email"],
            password=serializer.validated_data["password"],
            first_name=serializer.validated_data["first_name"],
            last_name=serializer.validated_data["last_name"],
            role=User.Role.ETABLISSEMENT_ADMIN,
            etablissement=pending_code.etablissement,
        )
        pending_code.utilise = True
        pending_code.utilise_le = timezone.now()
        pending_code.save(update_fields=["utilise", "utilise_le"])

        refresh = RefreshToken.for_user(user)
        log_activity(user, "RESPONSABLE_ETABLISSEMENT_INSCRIPTION", pending_code.etablissement.nom)
        return Response(
            {"access": str(refresh.access_token), "refresh": str(refresh)}, status=status.HTTP_201_CREATED
        )


class MeView(generics.RetrieveUpdateDestroyAPIView):
    """GET/PATCH/DELETE /api/users/me/ — RF-007. `get_object` renvoie
    toujours l'utilisateur connecté : impossible de consulter/modifier le
    profil de quelqu'un d'autre par ce endpoint.

    DELETE = suppression de compte en libre-service, réservée à un
    Apprenant ou un Formateur (jamais un Administrateur ou un responsable
    d'établissement par ce chemin : impact organisationnel trop large pour
    une action en un clic, sans confirmation d'un tiers)."""

    serializer_class = UserSerializer
    permission_classes = [IsAuthenticated]

    def get_object(self):
        return self.request.user

    def destroy(self, request, *args, **kwargs):
        if request.user.role not in (User.Role.STUDENT, User.Role.INSTRUCTOR):
            return Response(
                {"detail": "La suppression de compte en libre-service n'est pas disponible pour ce rôle."},
                status=status.HTTP_403_FORBIDDEN,
            )
        email = request.user.email
        Abonnement.objects.filter(user=request.user, statut=Abonnement.Statut.ACTIF).update(
            statut=Abonnement.Statut.ANNULE
        )
        request.user.anonymiser()
        log_activity(request.user, "COMPTE_SUPPRIME", email)
        return Response(status=status.HTTP_204_NO_CONTENT)


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


class PasswordChangeView(APIView):
    """POST /api/auth/password-change/ — l'utilisateur connecté change
    lui-même son mot de passe, en le prouvant via son mot de passe actuel
    (contrairement au flux PasswordReset*, qui ne nécessite pas d'être
    connecté et sert quand le mot de passe est oublié)."""

    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = PasswordChangeSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        if not request.user.check_password(serializer.validated_data["current_password"]):
            return Response(
                {"current_password": ["Mot de passe actuel incorrect."]}, status=status.HTTP_400_BAD_REQUEST
            )

        request.user.set_password(serializer.validated_data["new_password"])
        request.user.save(update_fields=["password"])
        log_activity(request.user, "PASSWORD_CHANGE")
        return Response({"detail": "Mot de passe modifié avec succès."})


class PasswordResetRequestView(APIView):
    """POST /api/auth/password-reset/ — RF-003, étape 1 : demande de lien.
    Répond toujours 200, même si l'email n'existe pas, pour ne pas révéler
    quels emails sont inscrits sur la plateforme (bonne pratique sécurité)."""

    permission_classes = [AllowAny]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = 'password_reset'

    def post(self, request):
        serializer = PasswordResetRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        email = serializer.validated_data["email"]

        user = User.objects.filter(email__iexact=email).first()
        if user is not None:
            uid = urlsafe_base64_encode(force_bytes(user.pk))
            token = default_token_generator.make_token(user)
            lien = f"{settings.FRONTEND_URL}/reinitialiser-mot-de-passe?uid={uid}&token={token}"
            send_mail(
                subject="Réinitialisation de votre mot de passe — AI Learning",
                message=(
                    "Cliquez sur ce lien pour choisir un nouveau mot de passe "
                    f"(valable un temps limité) :\n{lien}\n\n"
                    "Si vous n'êtes pas à l'origine de cette demande, ignorez cet email."
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
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = 'password_reset'

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
