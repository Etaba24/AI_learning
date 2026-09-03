from .models import JournalActivite


def log_activity(user, action, detail=""):
    """Enregistre une action sensible dans le journal d'activité (RNF-007).
    Utilisation depuis n'importe quelle app : log_activity(request.user, "LOGIN")."""
    JournalActivite.objects.create(utilisateur=user, action=action, detail=detail)
