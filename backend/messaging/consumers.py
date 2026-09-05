import json

from channels.generic.websocket import AsyncWebsocketConsumer
from rest_framework.utils.encoders import JSONEncoder

from accounts.models import User


class ChatConsumer(AsyncWebsocketConsumer):
    """Un seul canal par utilisateur connecté, pas un par conversation :
    reçoit un événement pour chaque message qui le concerne, qu'il soit
    apprenant ou formateur, sur n'importe laquelle de ses conversations.

    N'accepte aucun message entrant — l'envoi passe exclusivement par
    l'API REST existante (qui applique déjà toute la règle métier :
    premium + inscription). Ce canal ne sert qu'à pousser les nouveautés
    au client, pour éviter le rafraîchissement manuel/le polling."""

    async def connect(self):
        user = self.scope["user"]
        if not user or not user.is_authenticated or user.role not in (User.Role.STUDENT, User.Role.INSTRUCTOR):
            await self.close()
            return
        self.group_name = f"chat_user_{user.id}"
        await self.channel_layer.group_add(self.group_name, self.channel_name)
        await self.accept()

    async def disconnect(self, close_code):
        if hasattr(self, "group_name"):
            await self.channel_layer.group_discard(self.group_name, self.channel_name)

    async def receive(self, text_data=None, bytes_data=None):
        pass

    async def chat_message(self, event):
        # JSONEncoder de DRF (pas celui de json standard) : le payload
        # contient des UUID (ids) que l'encodeur standard ne sait pas
        # sérialiser, contrairement à celui déjà utilisé pour les réponses
        # REST classiques de ces mêmes serializers.
        await self.send(text_data=json.dumps(event["payload"], cls=JSONEncoder))
