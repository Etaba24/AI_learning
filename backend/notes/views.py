from rest_framework import generics
from rest_framework.permissions import IsAuthenticated

from billing.permissions import HasActiveSubscription

from core.utils import log_activity

from .models import Note
from .serializers import NoteSerializer


class NoteListCreateView(generics.ListCreateAPIView):
    """GET /api/notes/ (option ?lecon=<uuid>) — POST /api/notes/.
    Chacun ne voit et ne manipule que ses propres notes."""

    serializer_class = NoteSerializer
    permission_classes = [IsAuthenticated, HasActiveSubscription]

    def get_queryset(self):
        queryset = Note.objects.filter(proprietaire=self.request.user).select_related(
            "lecon__module__formation"
        )
        lecon_id = self.request.query_params.get("lecon")
        if lecon_id:
            queryset = queryset.filter(lecon_id=lecon_id)
        return queryset

    def perform_create(self, serializer):
        note = serializer.save(proprietaire=self.request.user)
        log_activity(self.request.user, "NOTE_CREATION", note.titre)


class NoteDetailView(generics.RetrieveUpdateDestroyAPIView):
    """GET/PATCH/DELETE /api/notes/<uuid>/ — restreint au propriétaire."""

    serializer_class = NoteSerializer
    permission_classes = [IsAuthenticated, HasActiveSubscription]

    def get_queryset(self):
        return Note.objects.filter(proprietaire=self.request.user).select_related(
            "lecon__module__formation"
        )

    def perform_destroy(self, instance):
        log_activity(self.request.user, "NOTE_SUPPRESSION", instance.titre)
        instance.delete()
