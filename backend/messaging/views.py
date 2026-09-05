from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.models import User
from accounts.permissions import IsInstructor, IsStudent
from billing.permissions import HasActiveSubscription
from core.utils import log_activity
from enrollments.models import Inscription

from .models import Conversation, Message
from .serializers import EnvoiMessageSerializer, MessageSerializer
from .services import diffuser_message, peut_chatter_avec


def _nom(user):
    return f"{user.first_name} {user.last_name}".strip() or user.email


class MesFormateursView(APIView):
    """GET /api/messagerie/mes-formateurs/ — côté apprenant : les
    formateurs avec qui il a le droit de discuter (au moins une formation
    en commun où il est inscrit). Liste d'éligibilité, pas seulement les
    conversations déjà entamées — sinon aucun premier message ne serait
    possible."""

    permission_classes = [IsStudent, HasActiveSubscription]

    def get(self, request):
        formateur_ids = (
            Inscription.objects.filter(apprenant=request.user)
            .values_list("formation__auteur_id", flat=True)
            .distinct()
        )
        formateurs = User.objects.filter(id__in=formateur_ids, role=User.Role.INSTRUCTOR)

        resultats = []
        for formateur in formateurs:
            conversation = Conversation.objects.filter(apprenant=request.user, formateur=formateur).first()
            dernier = conversation.messages.order_by("-created_at").first() if conversation else None
            non_lus = (
                conversation.messages.filter(lu=False).exclude(expediteur=request.user).count()
                if conversation
                else 0
            )
            resultats.append(
                {
                    "formateur_id": formateur.id,
                    "formateur_nom": _nom(formateur),
                    "formateur_email": formateur.email,
                    "conversation_id": conversation.id if conversation else None,
                    "dernier_message": dernier.contenu if dernier else None,
                    "dernier_message_date": dernier.created_at if dernier else None,
                    "non_lus": non_lus,
                }
            )

        avec_message = [r for r in resultats if r["dernier_message_date"]]
        sans_message = [r for r in resultats if not r["dernier_message_date"]]
        avec_message.sort(key=lambda r: r["dernier_message_date"], reverse=True)
        sans_message.sort(key=lambda r: r["formateur_nom"])
        return Response(avec_message + sans_message)


class FormateurMessagesView(APIView):
    """GET/POST /api/messagerie/formateurs/<uuid:formateur_id>/messages/ —
    côté apprenant : fil de discussion avec ce formateur précis. Crée le
    fil au premier message (get_or_create), jamais avant."""

    permission_classes = [IsStudent, HasActiveSubscription]

    def _formateur_autorise(self, request, formateur_id):
        formateur = get_object_or_404(User, pk=formateur_id, role=User.Role.INSTRUCTOR)
        if not peut_chatter_avec(request.user, formateur):
            return None
        return formateur

    def get(self, request, formateur_id):
        formateur = self._formateur_autorise(request, formateur_id)
        if formateur is None:
            return Response(
                {"detail": "Vous devez être inscrit à une formation de ce formateur pour lui écrire."},
                status=status.HTTP_403_FORBIDDEN,
            )
        conversation = Conversation.objects.filter(apprenant=request.user, formateur=formateur).first()
        if not conversation:
            return Response([])
        conversation.messages.filter(lu=False).exclude(expediteur=request.user).update(lu=True)
        return Response(MessageSerializer(conversation.messages.all(), many=True).data)

    def post(self, request, formateur_id):
        formateur = self._formateur_autorise(request, formateur_id)
        if formateur is None:
            return Response(
                {"detail": "Vous devez être inscrit à une formation de ce formateur pour lui écrire."},
                status=status.HTTP_403_FORBIDDEN,
            )
        serializer = EnvoiMessageSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        conversation, _ = Conversation.objects.get_or_create(apprenant=request.user, formateur=formateur)
        message = Message.objects.create(
            conversation=conversation, expediteur=request.user, contenu=serializer.validated_data["contenu"]
        )
        log_activity(request.user, "MESSAGE_ENVOYE", f"à {formateur.email}")
        diffuser_message(message)
        return Response(MessageSerializer(message).data, status=status.HTTP_201_CREATED)


class MesConversationsView(APIView):
    """GET /api/messagerie/conversations/ — côté formateur : la liste des
    apprenants avec qui une conversation existe déjà."""

    permission_classes = [IsInstructor]

    def get(self, request):
        conversations = Conversation.objects.filter(formateur=request.user).select_related("apprenant")

        resultats = []
        for conversation in conversations:
            dernier = conversation.messages.order_by("-created_at").first()
            non_lus = conversation.messages.filter(lu=False).exclude(expediteur=request.user).count()
            resultats.append(
                {
                    "conversation_id": conversation.id,
                    "apprenant_id": conversation.apprenant_id,
                    "apprenant_nom": _nom(conversation.apprenant),
                    "apprenant_email": conversation.apprenant.email,
                    "dernier_message": dernier.contenu if dernier else None,
                    "dernier_message_date": dernier.created_at if dernier else None,
                    "non_lus": non_lus,
                    "created_at": conversation.created_at,
                }
            )

        resultats.sort(key=lambda r: r["dernier_message_date"] or r["created_at"], reverse=True)
        return Response(resultats)


class ConversationMessagesView(APIView):
    """GET/POST /api/messagerie/conversations/<uuid:pk>/messages/ — côté
    formateur : ouvrir et répondre à une conversation. 404 si le fil
    n'appartient pas à ce formateur (jamais de fuite d'existence)."""

    permission_classes = [IsInstructor]

    def get(self, request, pk):
        conversation = get_object_or_404(Conversation, pk=pk, formateur=request.user)
        conversation.messages.filter(lu=False).exclude(expediteur=request.user).update(lu=True)
        return Response(MessageSerializer(conversation.messages.all(), many=True).data)

    def post(self, request, pk):
        conversation = get_object_or_404(Conversation, pk=pk, formateur=request.user)
        serializer = EnvoiMessageSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        message = Message.objects.create(
            conversation=conversation, expediteur=request.user, contenu=serializer.validated_data["contenu"]
        )
        log_activity(request.user, "MESSAGE_ENVOYE", f"à {conversation.apprenant.email}")
        diffuser_message(message)
        return Response(MessageSerializer(message).data, status=status.HTTP_201_CREATED)
