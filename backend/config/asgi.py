"""
ASGI config for config project.

Sert HTTP (Django classique) et WebSocket (messagerie temps réel +
notifications génériques « données modifiées ») sur le même process — voir
messaging/consumers.py, core/consumers.py et core/middleware.py.

For more information on this file, see
https://docs.djangoproject.com/en/6.1/howto/deployment/asgi/
"""

import os

from django.core.asgi import get_asgi_application

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')

# Doit être instancié avant tout import touchant aux modèles Django (routing,
# middleware, consumers) : c'est ce qui déclenche django.setup().
django_asgi_app = get_asgi_application()

from channels.routing import ProtocolTypeRouter, URLRouter  # noqa: E402

from core.middleware import JWTAuthMiddleware  # noqa: E402
from core.routing import websocket_urlpatterns as core_ws_urlpatterns  # noqa: E402
from messaging.routing import websocket_urlpatterns as messaging_ws_urlpatterns  # noqa: E402

application = ProtocolTypeRouter(
    {
        'http': django_asgi_app,
        'websocket': JWTAuthMiddleware(URLRouter(messaging_ws_urlpatterns + core_ws_urlpatterns)),
    }
)
