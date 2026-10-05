from django.conf import settings
from django.db import models

from core.models import TimeStampedModel

CROQUIS_PAR_DEFAUT = """function setup() {
  pinMode(13, OUTPUT);
}

function loop() {
  digitalWrite(13, HIGH);
  delay(500);
  digitalWrite(13, LOW);
  delay(500);
}
"""


class Sketch(TimeStampedModel):
    """Croquis (sketch) de l'outil Systèmes embarqués (Arduino).

    `code` stocke le texte du croquis façon Arduino (setup()/loop(), API
    pinMode/digitalWrite/digitalRead/delay) — interprété côté frontend
    (pas un vrai compilateur C++, un sous-ensemble JS compatible exécuté
    sur une carte virtuelle simulée). Le backend ne l'interprète pas, même
    principe que `Scene3D.objets`/`Carte.elements`."""

    proprietaire = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="sketches"
    )
    nom = models.CharField(max_length=150)
    code = models.TextField(default=CROQUIS_PAR_DEFAUT, blank=True)
    # Montage libre construit par l'apprenant (composants placés + fils) —
    # voir frontend/arduinoCircuit.ts pour la forme exacte. Le backend ne
    # l'interprète pas, même principe que `code`.
    circuit = models.JSONField(default=dict, blank=True)

    class Meta:
        ordering = ["-updated_at"]

    def __str__(self):
        return f"{self.nom} ({self.proprietaire.email})"
