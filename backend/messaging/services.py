"""Règle métier de la messagerie apprenant <-> formateur — source unique de
vérité, réutilisée par toutes les vues plutôt que dupliquée."""

from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer

from billing.services import a_acces_premium
from enrollments.models import Inscription

from .serializers import MessageSerializer


def peut_chatter_avec(apprenant, formateur):
    """Un apprenant Premium peut discuter avec un formateur s'il est
    inscrit à au moins une de ses formations. Revérifié à chaque appel
    (pas seulement à la création du fil) : un abonnement expiré ou une
    désinscription coupe l'accès immédiatement, comme pour les autres
    services premium de la plateforme."""
    if not a_acces_premium(apprenant):
        return False
    return Inscription.objects.filter(apprenant=apprenant, formation__auteur=formateur).exists()


def diffuser_message(message):
    """Pousse un nouveau message aux deux participants via WebSocket — évite
    tout rafraîchissement manuel/polling côté client. Best-effort : si la
    couche de canal n'est pas joignable, l'écriture en base reste valide,
    seul le direct live est perdu (le client retombera sur les bonnes
    données à sa prochaine ouverture de la page)."""
    channel_layer = get_channel_layer()
    if channel_layer is None:
        return

    payload = {
        "conversation_id": str(message.conversation_id),
        "message": MessageSerializer(message).data,
    }
    for user_id in (message.conversation.apprenant_id, message.conversation.formateur_id):
        async_to_sync(channel_layer.group_send)(
            f"chat_user_{user_id}", {"type": "chat.message", "payload": payload}
        )
