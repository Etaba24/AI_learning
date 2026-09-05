from django.urls import re_path

from . import consumers

websocket_urlpatterns = [
    re_path(r"^ws/temps-reel/$", consumers.TopicsConsumer.as_asgi()),
]
