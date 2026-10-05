import json
from urllib.parse import parse_qs

from channels.generic.websocket import AsyncWebsocketConsumer
from rest_framework.utils.encoders import JSONEncoder

from accounts.models import User

# Rôles autorisés à s'abonner à chaque topic — toujours aligné sur les
# permissions des vues REST qui exposent les données concernées, jamais
# plus large (un topic n'est qu'un signal « re-fetch », mais il ne doit
# pas révéler à un rôle l'existence d'une activité qu'il n'a pas le droit
# de voir). `None` = tout utilisateur authentifié.
TOPIC_ROLES = {
    "admin_dashboard": {User.Role.ADMIN, User.Role.INSTRUCTOR},
    "admin_users": {User.Role.ADMIN, User.Role.INSTRUCTOR},
    "admin_formations": {User.Role.ADMIN, User.Role.INSTRUCTOR},
    "admin_categories": {User.Role.ADMIN, User.Role.INSTRUCTOR},
    "admin_departements": {User.Role.ADMIN, User.Role.INSTRUCTOR},
    "admin_abonnements": {User.Role.ADMIN},
    "admin_etablissements": {User.Role.ADMIN},
    "instructor_formations": {User.Role.INSTRUCTOR, User.Role.ADMIN},
    "instructor_students": {User.Role.INSTRUCTOR, User.Role.ADMIN},
    "admin_documents": {User.Role.ADMIN, User.Role.INSTRUCTOR},
    "instructor_documents": {User.Role.INSTRUCTOR, User.Role.ADMIN},
    "bibliotheque": None,
    "catalogue": None,
    "mes_formations": None,
    "annonces": None,
    "admin_annonces": {User.Role.ADMIN},
    "etablissement_membres": {User.Role.ETABLISSEMENT_ADMIN},
    "etablissement_classes": {User.Role.ETABLISSEMENT_ADMIN},
}


class TopicsConsumer(AsyncWebsocketConsumer):
    """Canal générique de notifications « les données ont changé » — aucun
    contenu poussé, juste un signal pour déclencher un re-fetch ciblé côté
    client (la source de vérité reste toujours l'API REST). Le client
    choisit les topics qui l'intéressent via `?topics=a,b,c` ; toute
    demande hors de TOPIC_ROLES ou hors du rôle de l'utilisateur est
    silencieusement ignorée (jamais d'erreur qui révélerait l'existence
    d'un topic auquel il n'a pas droit)."""

    async def connect(self):
        user = self.scope["user"]
        if not user or not user.is_authenticated:
            await self.close()
            return

        query_string = parse_qs(self.scope["query_string"].decode())
        requested = query_string.get("topics", [""])[0].split(",")

        self.group_names = []
        for topic in requested:
            topic = topic.strip()
            if topic not in TOPIC_ROLES:
                continue
            allowed_roles = TOPIC_ROLES[topic]
            if allowed_roles is not None and user.role not in allowed_roles:
                continue
            self.group_names.append(f"topic_{topic}")

        if not self.group_names:
            await self.close()
            return

        for group_name in self.group_names:
            await self.channel_layer.group_add(group_name, self.channel_name)
        await self.accept()

    async def disconnect(self, close_code):
        for group_name in getattr(self, "group_names", []):
            await self.channel_layer.group_discard(group_name, self.channel_name)

    async def receive(self, text_data=None, bytes_data=None):
        pass

    async def topic_event(self, event):
        await self.send(text_data=json.dumps(event["payload"], cls=JSONEncoder))
