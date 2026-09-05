from rest_framework.permissions import BasePermission

from .models import User


class IsAdmin(BasePermission):
    """A poser en permission_classes sur une vue pour la réserver aux
    Administrateurs (RNF-002 : RBAC contrôlé sur chaque endpoint)."""

    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and request.user.role == User.Role.ADMIN)


class IsInstructor(BasePermission):
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and request.user.role == User.Role.INSTRUCTOR)


class IsStudent(BasePermission):
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and request.user.role == User.Role.STUDENT)


class IsInstructorOrAdmin(BasePermission):
    """Permet l'accès aux Administrateurs et aux Formateurs."""

    def has_permission(self, request, view):
        return bool(
            request.user
            and request.user.is_authenticated
            and request.user.role in (User.Role.ADMIN, User.Role.INSTRUCTOR)
        )


class IsEtablissementAdmin(BasePermission):
    """Réservé au responsable d'un établissement client (B2B) — jamais
    l'admin plateforme. `etablissement_id` obligatoire : sans établissement
    rattaché, ce rôle n'aurait aucune donnée à scoper (ne devrait pas
    arriver en pratique, mais la vue ne doit jamais planter dessus)."""

    message = "Réservé aux administrateurs d'établissement."

    def has_permission(self, request, view):
        return bool(
            request.user
            and request.user.is_authenticated
            and request.user.role == User.Role.ETABLISSEMENT_ADMIN
            and request.user.etablissement_id
        )

