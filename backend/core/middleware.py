from urllib.parse import parse_qs

from channels.db import database_sync_to_async
from channels.middleware import BaseMiddleware
from django.contrib.auth.models import AnonymousUser
from django.core.cache import cache


@database_sync_to_async
def _get_user_from_ticket(ticket):
    from accounts.models import User

    cache_key = f"ws_ticket:{ticket}"
    user_id = cache.get(cache_key)
    if user_id is None:
        return AnonymousUser()
    # Usage unique : consommé immédiatement, jamais réutilisable même si
    # quelqu'un d'autre l'intercepte après coup (log d'accès, proxy...).
    cache.delete(cache_key)
    try:
        user = User.objects.get(pk=user_id)
    except User.DoesNotExist:
        return AnonymousUser()
    return user if user.is_active else AnonymousUser()


class JWTAuthMiddleware(BaseMiddleware):
    """Authentifie la connexion WebSocket via un TICKET à usage unique et
    très courte durée de vie (`?ticket=...`, voir accounts.views.
    WebSocketTicketView) — jamais le jeton JWT d'accès complet. Un
    navigateur ne peut pas fixer d'en-tête Authorization sur une requête
    WebSocket, donc quelque chose finit nécessairement dans la query
    string ; si c'était le JWT complet, il resterait exploitable jusqu'à
    30 minutes s'il fuitait dans un log d'accès serveur/proxy. Un ticket
    expiré en quelques secondes et consommable une seule fois n'offre plus
    rien après coup — aucun autre chemin d'authentification WebSocket
    n'existe, pour ne jamais rouvrir ce contournement."""

    async def __call__(self, scope, receive, send):
        query_string = parse_qs(scope["query_string"].decode())
        ticket = query_string.get("ticket", [None])[0]
        scope["user"] = await _get_user_from_ticket(ticket) if ticket else AnonymousUser()
        return await super().__call__(scope, receive, send)
