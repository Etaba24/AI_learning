from django.db.models.signals import post_delete, post_save
from django.dispatch import receiver

from .models import Departement
from .realtime import notifier


@receiver(post_save, sender=Departement)
@receiver(post_delete, sender=Departement)
def departement_modifie(sender, instance, **kwargs):
    notifier("admin_departements")
