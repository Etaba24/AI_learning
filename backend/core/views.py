import mimetypes
import re
from pathlib import Path

from django.conf import settings
from django.core.mail import send_mail
from django.db.models import ProtectedError
from django.http import Http404, HttpResponse, HttpResponseNotModified
from django.utils._os import safe_join
from django.utils.http import http_date
from django.views.static import was_modified_since
from rest_framework import generics, status
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.models import User
from accounts.permissions import IsAdmin, IsInstructorOrAdmin
from trainings.models import Formation

from .models import Departement, JournalActivite
from .serializers import ContactMessageSerializer, DepartementSerializer, JournalActiviteSerializer


_RANGE_RE = re.compile(r"bytes=(\d*)-(\d*)$")


def serve_media_range(request, path):
    """Sert les fichiers de MEDIA_ROOT en développement — mais, contrairement
    à django.views.static.serve, avec un vrai support des requêtes Range
    (bytes=...). Sans ça, un gros fichier vidéo ne se lit jamais dans le
    navigateur : celui-ci a besoin de sauter dans le fichier (metadonnées en
    fin de fichier, seek) via des requêtes Range, et le serveur qui répond
    toujours 200 avec le corps entier au lieu du 206 partiel attendu fait
    échouer la lecture ("No video with supported format...").

    Volontairement PAS de FileResponse/flux streamé ici : sous Daphne/ASGI
    (imposé par Channels pour le temps réel), le streaming d'un
    StreamingHttpResponse synchrone se coupait parfois en cours de route de
    façon intermittente (constaté avec GStreamer, le moteur de lecture de
    Firefox sous Linux : erreur "Internal data stream error" sporadique) —
    en dev, lire tout le segment demandé en mémoire puis répondre d'un bloc
    est plus lent mais fiable, contrairement au flux."""

    fullpath = Path(safe_join(settings.MEDIA_ROOT, path))
    if fullpath.is_dir() or not fullpath.exists():
        raise Http404("Fichier introuvable.")

    statobj = fullpath.stat()
    if not was_modified_since(request.META.get("HTTP_IF_MODIFIED_SINCE"), statobj.st_mtime):
        return HttpResponseNotModified()

    content_type, encoding = mimetypes.guess_type(str(fullpath))
    content_type = content_type or "application/octet-stream"
    file_size = statobj.st_size

    range_match = _RANGE_RE.match(request.META.get("HTTP_RANGE", ""))
    if not range_match:
        start, end = 0, file_size - 1
    else:
        start_str, end_str = range_match.groups()
        if start_str == "":
            # Forme "suffix" bytes=-N : les N DERNIERS octets du fichier —
            # pas "du début jusqu'à N". C'est précisément ce que le lecteur
            # vidéo demande pour trouver l'atome moov quand il est en fin de
            # fichier (cas de ces vidéos) ; le confondre avec un
            # "bytes=0-N" renvoyait le début du fichier au lieu de la fin.
            suffix_length = int(end_str)
            start = max(file_size - suffix_length, 0)
            end = file_size - 1
        else:
            start = int(start_str)
            end = int(end_str) if end_str else file_size - 1
            end = min(end, file_size - 1)

        if start > end or start >= file_size:
            response = HttpResponse(status=416)
            response.headers["Content-Range"] = f"bytes */{file_size}"
            return response

    length = end - start + 1
    with fullpath.open("rb") as f:
        f.seek(start)
        data = f.read(length)

    is_partial = bool(range_match)
    response = HttpResponse(data, content_type=content_type, status=206 if is_partial else 200)
    response.headers["Content-Length"] = str(len(data))
    if is_partial:
        response.headers["Content-Range"] = f"bytes {start}-{end}/{file_size}"
    response.headers["Accept-Ranges"] = "bytes"
    response.headers["Last-Modified"] = http_date(statobj.st_mtime)
    # En dev, le navigateur ne doit jamais réutiliser une réponse mise en
    # cache d'avant ce correctif (ex : un téléchargement partiel raté quand
    # le Range n'était pas encore honoré) — Last-Modified/ETag n'ayant pas
    # changé (fichier inchangé), rien d'autre ne l'y forcerait.
    response.headers["Cache-Control"] = "no-store"
    if encoding:
        response.headers["Content-Encoding"] = encoding
    return response


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
                    "actifs": User.objects.filter(is_active=True).count(),
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


class InstructorStatsView(APIView):
    """GET /api/formateur/stats/ — tableau de bord du formateur : uniquement
    ses propres formations (jamais celles des autres formateurs), et les
    apprenants/progressions qui s'y rattachent. Un admin consultant cette
    vue voit l'ensemble (même logique que _formation_queryset_for côté
    trainings)."""

    permission_classes = [IsInstructorOrAdmin]

    def get(self, request):
        from enrollments.models import Inscription, Progression

        formations_qs = Formation.objects.all()
        if request.user.role == User.Role.INSTRUCTOR:
            formations_qs = formations_qs.filter(auteur=request.user)

        total_students = (
            Inscription.objects.filter(formation__in=formations_qs)
            .values("apprenant")
            .distinct()
            .count()
        )

        recent_progress = (
            Progression.objects.filter(inscription__formation__in=formations_qs)
            .select_related("inscription__apprenant", "inscription__formation", "lecon")
            .order_by("-updated_at")[:8]
        )

        def nom_apprenant(user):
            full = f"{user.first_name} {user.last_name}".strip()
            return full or user.email

        return Response(
            {
                "total_formations": formations_qs.count(),
                "published_formations": formations_qs.filter(statut=Formation.Statut.PUBLIEE).count(),
                "pending_formations": formations_qs.filter(statut=Formation.Statut.SOUMISE).count(),
                "total_students": total_students,
                "recent_activity": [
                    {
                        "apprenant_nom": nom_apprenant(p.inscription.apprenant),
                        "formation_titre": p.inscription.formation.titre,
                        "lecon_titre": p.lecon.titre,
                        "statut": p.statut,
                        "updated_at": p.updated_at,
                    }
                    for p in recent_progress
                ],
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
