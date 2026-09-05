from rest_framework.permissions import BasePermission

from .services import a_acces_premium


class HasActiveSubscription(BasePermission):
    """À poser sur toute vue réservée aux abonnés premium. La liste des
    services premium évoluera : cette permission est le seul point à
    ajouter sur une vue pour la rendre payante."""

    message = "Cette fonctionnalité nécessite un abonnement actif."

    def has_permission(self, request, view):
        return a_acces_premium(request.user)
