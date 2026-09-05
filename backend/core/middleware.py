from urllib.parse import parse_qs

from channels.db import database_sync_to_async
from channels.middleware import BaseMiddleware
from django.contrib.auth.models import AnonymousUser
from rest_framework_simplejwt.exceptions import TokenError
from rest_framework_simplejwt.tokens import AccessToken


@database_sync_to_async
def _get_user_from_token(token):
    from accounts.models import User

    try:
        validated = AccessToken(token)
        user = User.objects.get(pk=validated["user_id"])
    except (TokenError, User.DoesNotExist, KeyError):
        return AnonymousUser()
    return user if user.is_active else AnonymousUser()


class JWTAuthMiddleware(BaseMiddleware):
    """Authentifie la connexion WebSocket avec le même jeton JWT que l'API
    REST — passé en query string (`?token=...`) puisqu'un navigateur ne
    peut pas fixer d'en-tête Authorization sur une requête WebSocket."""

    async def __call__(self, scope, receive, send):
        query_string = parse_qs(scope["query_string"].decode())
        token = query_string.get("token", [None])[0]
        scope["user"] = await _get_user_from_token(token) if token else AnonymousUser()
        return await super().__call__(scope, receive, send)
