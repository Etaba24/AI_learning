from django.urls import path

from . import views

urlpatterns = [
    path("messagerie/mes-formateurs/", views.MesFormateursView.as_view(), name="messagerie-mes-formateurs"),
    path(
        "messagerie/formateurs/<uuid:formateur_id>/messages/",
        views.FormateurMessagesView.as_view(),
        name="messagerie-formateur-messages",
    ),
    path("messagerie/conversations/", views.MesConversationsView.as_view(), name="messagerie-conversations"),
    path(
        "messagerie/conversations/<uuid:pk>/messages/",
        views.ConversationMessagesView.as_view(),
        name="messagerie-conversation-messages",
    ),
]
