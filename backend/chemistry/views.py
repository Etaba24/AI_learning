from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle
from rest_framework.views import APIView

from billing.permissions import HasToolAccess
from core.utils import log_activity
from trainings.models import Outil

from .pubchem import MoleculeIntrouvable, parser_sdf_v2000, recuperer_sdf

MODES_AUTORISES = ("nom", "formule")


class MoleculeSearchView(APIView):
    """GET /api/chimie/molecule/?q=<recherche>&mode=nom|formule — cherche
    une molécule réelle auprès de PubChem (base publique du NIH) et renvoie
    ses atomes/liaisons pour un rendu 3D ball-and-stick. Ne fabrique jamais
    de structure : si PubChem n'a rien, l'apprenant reçoit une erreur
    honnête plutôt qu'une molécule inventée."""

    permission_classes = [IsAuthenticated, HasToolAccess]
    outil_code = Outil.Code.CHIMIE_3D
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "molecule_search"

    def get(self, request):
        recherche = (request.query_params.get("q") or "").strip()
        mode = request.query_params.get("mode", "nom")

        if not recherche:
            return Response({"detail": "Le champ de recherche est requis."}, status=status.HTTP_400_BAD_REQUEST)
        if mode not in MODES_AUTORISES:
            return Response({"detail": "mode doit être 'nom' ou 'formule'."}, status=status.HTTP_400_BAD_REQUEST)

        try:
            sdf_text, dimension = recuperer_sdf(recherche, mode)
        except MoleculeIntrouvable:
            return Response(
                {"detail": f"Aucune structure trouvée pour « {recherche} »."},
                status=status.HTTP_404_NOT_FOUND,
            )
        except ConnectionError:
            return Response(
                {"detail": "Impossible de contacter le service de structures chimiques (PubChem), réessayez."},
                status=status.HTTP_502_BAD_GATEWAY,
            )

        try:
            atomes, liaisons = parser_sdf_v2000(sdf_text)
        except ValueError:
            return Response(
                {"detail": "La structure renvoyée par PubChem n'a pas pu être interprétée."},
                status=status.HTTP_502_BAD_GATEWAY,
            )

        log_activity(request.user, "CHIMIE_MOLECULE_RECHERCHE", f"{recherche} ({mode})")

        return Response(
            {
                "recherche": recherche,
                "dimension": dimension,  # '3d' ou '2d' (repli honnête si PubChem n'a pas de conformère 3D)
                "atomes": atomes,
                "liaisons": liaisons,
            }
        )
