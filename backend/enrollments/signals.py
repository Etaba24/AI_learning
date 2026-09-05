from django.db.models.signals import post_delete, post_save
from django.dispatch import receiver

from core.realtime import notifier

from .models import Inscription


@receiver(post_save, sender=Inscription)
@receiver(post_delete, sender=Inscription)
def inscription_modifiee(sender, instance, **kwargs):
    notifier("mes_formations")
    notifier("instructor_students")
