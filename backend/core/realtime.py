"""Notifications temps réel génériques (« les données ont changé »), pour
toute l'application — pas seulement la messagerie. Un topic = un flux
d'événements auquel une page s'abonne pour savoir QUAND se re-synchroniser ;
la donnée elle-même reste toujours lue depuis l'API REST habituelle (le
WebSocket ne transporte jamais la vérité, juste le signal de fraîcheur).

Voir core/consumers.py pour la liste des topics et les rôles autorisés à
s'y abonner, et messaging/services.py pour l'équivalent côté messagerie
(canal personnel, pas un topic partagé)."""

from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer


def notifier(topic, **payload):
    """Diffuse un événement à tous les clients abonnés à ce topic.
    Best-effort : si la couche de canal n'est pas joignable, l'écriture en
    base reste valide, seule la mise à jour live est perdue (le client
    retombera sur les bonnes données à sa prochaine ouverture de page)."""
    channel_layer = get_channel_layer()
    if channel_layer is None:
        return
    async_to_sync(channel_layer.group_send)(
        f"topic_{topic}", {"type": "topic.event", "payload": {"topic": topic, **payload}}
    )
