from django.db.models.signals import post_delete, post_save
from django.dispatch import receiver

from core.realtime import notifier

from .models import Annonce


@receiver(post_save, sender=Annonce)
@receiver(post_delete, sender=Annonce)
def annonce_modifiee(sender, instance, **kwargs):
    notifier("annonces")
    notifier("admin_annonces")
