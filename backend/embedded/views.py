from rest_framework import generics
from rest_framework.permissions import IsAuthenticated

from billing.permissions import HasToolAccess
from trainings.models import Outil

from core.utils import log_activity

from .models import Sketch
from .serializers import SketchListSerializer, SketchSerializer


class SketchListCreateView(generics.ListCreateAPIView):
    """GET /api/sketches/ (liste, sans code) — POST /api/sketches/.
    Chacun ne voit et ne manipule que ses propres croquis."""

    permission_classes = [IsAuthenticated, HasToolAccess]
    outil_code = Outil.Code.ARDUINO

    def get_serializer_class(self):
        if self.request.method == "GET":
            return SketchListSerializer
        return SketchSerializer

    def get_queryset(self):
        return Sketch.objects.filter(proprietaire=self.request.user)

    def perform_create(self, serializer):
        sketch = serializer.save(proprietaire=self.request.user)
        log_activity(self.request.user, "SKETCH_CREATION", sketch.nom)


class SketchDetailView(generics.RetrieveUpdateDestroyAPIView):
    """GET/PATCH/DELETE /api/sketches/<uuid>/ — restreint au propriétaire."""

    serializer_class = SketchSerializer
    permission_classes = [IsAuthenticated, HasToolAccess]
    outil_code = Outil.Code.ARDUINO

    def get_queryset(self):
        return Sketch.objects.filter(proprietaire=self.request.user)

    def perform_destroy(self, instance):
        log_activity(self.request.user, "SKETCH_SUPPRESSION", instance.nom)
        instance.delete()
