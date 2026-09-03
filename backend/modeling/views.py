from rest_framework import generics
from rest_framework.permissions import IsAuthenticated

from core.utils import log_activity

from .models import Scene3D
from .serializers import Scene3DListSerializer, Scene3DSerializer


class Scene3DListCreateView(generics.ListCreateAPIView):
    """GET /api/scenes3d/ (liste, sans objets) — POST /api/scenes3d/.
    Chacun ne voit et ne manipule que ses propres scènes."""

    permission_classes = [IsAuthenticated]

    def get_serializer_class(self):
        if self.request.method == "GET":
            return Scene3DListSerializer
        return Scene3DSerializer

    def get_queryset(self):
        return Scene3D.objects.filter(proprietaire=self.request.user)

    def perform_create(self, serializer):
        scene = serializer.save(proprietaire=self.request.user)
        log_activity(self.request.user, "SCENE3D_CREATION", scene.nom)


class Scene3DDetailView(generics.RetrieveUpdateDestroyAPIView):
    """GET/PATCH/DELETE /api/scenes3d/<uuid>/ — restreint au propriétaire."""

    serializer_class = Scene3DSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Scene3D.objects.filter(proprietaire=self.request.user)

    def perform_destroy(self, instance):
        log_activity(self.request.user, "SCENE3D_SUPPRESSION", instance.nom)
        instance.delete()
