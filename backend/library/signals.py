from django.db.models.signals import post_delete, post_save
from django.dispatch import receiver

from core.realtime import notifier

from .models import Document


@receiver(post_save, sender=Document)
@receiver(post_delete, sender=Document)
def document_modifie(sender, instance, **kwargs):
    notifier("admin_documents")
    notifier("instructor_documents")
    notifier("bibliotheque")
