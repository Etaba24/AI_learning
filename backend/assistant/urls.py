from django.urls import path
from . import views

urlpatterns = [
    path("assistant/ask/", views.AssistantAskView.as_view(), name="assistant-ask"),
    path("assistant/history/", views.ConversationIAListView.as_view(), name="assistant-history"),
]
