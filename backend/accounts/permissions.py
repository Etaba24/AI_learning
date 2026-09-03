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

