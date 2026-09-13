from rest_framework.permissions import BasePermission

from .services import a_acces_gratuit_outil, a_acces_premium


class HasActiveSubscription(BasePermission):
    """À poser sur toute vue réservée aux abonnés premium. La liste des
    services premium évoluera : cette permission est le seul point à
    ajouter sur une vue pour la rendre payante."""

    message = "Cette fonctionnalité nécessite un abonnement actif."

    def has_permission(self, request, view):
        return a_acces_premium(request.user)


class HasToolAccess(BasePermission):
    """Comme HasActiveSubscription, mais laisse aussi passer un apprenant
    qui a débloqué GRATUITEMENT cet outil précis via ses catégories
    d'intérêt choisies à l'inscription (RG : jamais un abonnement complet,
    seulement cet outil-là — voir billing.services.a_acces_gratuit_outil).
    La vue doit déclarer `outil_code = trainings.models.Outil.Code.XXX`."""

    message = "Cette fonctionnalité nécessite un abonnement actif (ou une catégorie d'intérêt qui la débloque)."

    def has_permission(self, request, view):
        outil_code = getattr(view, "outil_code", None)
        assert outil_code, f"{view.__class__.__name__} doit déclarer outil_code pour utiliser HasToolAccess."
        return a_acces_premium(request.user) or a_acces_gratuit_outil(request.user, outil_code)
