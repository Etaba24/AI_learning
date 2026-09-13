import json
import urllib.error
import urllib.request

from django.conf import settings
from rest_framework import status
from rest_framework.permissions import IsAuthenticated

from billing.permissions import HasToolAccess
from rest_framework.response import Response
from rest_framework.views import APIView

from core.utils import log_activity
from trainings.models import Outil

from .serializers import RunCodeSerializer

JDOODLE_EXECUTE_URL = "https://api.jdoodle.com/v1/execute"

# Identifiants de langage JDoodle. versionIndex vérifiés un par un le
# 2026-09-02 en exécutant du vrai code (Java volontairement sur 21 LTS,
# la version la plus enseignée, plutôt que l'index max qui donne JDK 26).
LANGUAGES = {
    "python3": {"label": "Python 3.14", "version_index": "6"},
    "nodejs": {"label": "JavaScript (Node.js 25)", "version_index": "7"},
    "php": {"label": "PHP 8.5", "version_index": "6"},
    "java": {"label": "Java 21 (LTS)", "version_index": "5"},
    "c": {"label": "C (GCC)", "version_index": "7"},
    "cpp": {"label": "C++17", "version_index": "7"},
    "csharp": {"label": "C# (.NET 10)", "version_index": "6"},
    "go": {"label": "Go 1.26", "version_index": "6"},
    "ruby": {"label": "Ruby 3.4", "version_index": "6"},
    "bash": {"label": "Bash 5.3", "version_index": "6"},
}


class PlaygroundLanguagesView(APIView):
    """GET /api/playground/languages/ — langages disponibles dans l'IDE."""

    permission_classes = [IsAuthenticated, HasToolAccess]
    outil_code = Outil.Code.IDE

    def get(self, request):
        return Response([{"id": key, "label": meta["label"]} for key, meta in LANGUAGES.items()])


class PlaygroundRunView(APIView):
    """POST /api/playground/run/ — exécution réelle du code via l'API
    JDoodle. Aucune simulation : le code est vraiment compilé/exécuté par
    le service, la sortie est renvoyée telle quelle."""

    permission_classes = [IsAuthenticated, HasToolAccess]
    outil_code = Outil.Code.IDE

    def post(self, request):
        serializer = RunCodeSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        language = serializer.validated_data["language"]
        code = serializer.validated_data["code"]
        stdin = serializer.validated_data.get("stdin", "")

        meta = LANGUAGES.get(language)
        if meta is None:
            return Response({"detail": "Langage non supporté."}, status=status.HTTP_400_BAD_REQUEST)

        if not settings.JDOODLE_CLIENT_ID or not settings.JDOODLE_CLIENT_SECRET:
            return Response(
                {"detail": "L'exécution de code n'est pas encore configurée côté serveur (identifiants JDoodle manquants)."},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )

        payload = json.dumps(
            {
                "clientId": settings.JDOODLE_CLIENT_ID,
                "clientSecret": settings.JDOODLE_CLIENT_SECRET,
                "script": code,
                "stdin": stdin,
                "language": language,
                "versionIndex": meta["version_index"],
                "compileOnly": False,
            }
        ).encode("utf-8")

        req = urllib.request.Request(
            JDOODLE_EXECUTE_URL,
            data=payload,
            # Le User-Agent par défaut "Python-urllib" est bloqué (403) par la
            # protection anti-bot devant l'API JDoodle.
            headers={"Content-Type": "application/json", "User-Agent": "ai-learning-backend/1.0"},
            method="POST",
        )
        try:
            with urllib.request.urlopen(req, timeout=20) as resp:
                result = json.loads(resp.read().decode("utf-8"))
        except urllib.error.HTTPError as exc:
            if exc.code == 401:
                return Response(
                    {"detail": "Identifiants JDoodle invalides côté serveur."},
                    status=status.HTTP_503_SERVICE_UNAVAILABLE,
                )
            if exc.code == 429:
                return Response(
                    {"detail": "Le quota journalier d'exécutions de code est atteint, réessayez demain."},
                    status=status.HTTP_503_SERVICE_UNAVAILABLE,
                )
            return Response(
                {"detail": f"Erreur du service d'exécution ({exc.code})."},
                status=status.HTTP_502_BAD_GATEWAY,
            )
        except (urllib.error.URLError, TimeoutError):
            return Response(
                {"detail": "Impossible de contacter le service d'exécution de code."},
                status=status.HTTP_502_BAD_GATEWAY,
            )

        # JDoodle renvoie parfois ses erreurs (quota, identifiants) en 200
        # avec un statusCode applicatif dans le corps.
        api_status = result.get("statusCode", 200)
        if api_status == 429:
            return Response(
                {"detail": "Le quota journalier d'exécutions de code est atteint, réessayez demain."},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )
        if api_status == 401:
            return Response(
                {"detail": "Identifiants JDoodle invalides côté serveur."},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )
        if api_status != 200:
            return Response(
                {"detail": result.get("error", f"Erreur du service d'exécution ({api_status}).")},
                status=status.HTTP_502_BAD_GATEWAY,
            )

        log_activity(request.user, "PLAYGROUND_RUN", f"{language}: {len(code)} caractères")

        return Response(
            {
                "output": result.get("output", ""),
                "cpu_time": result.get("cpuTime"),
                "memory": result.get("memory"),
            },
            status=status.HTTP_200_OK,
        )
