from django.db.models.signals import post_delete, post_save
from django.dispatch import receiver

from core.realtime import notifier

from .models import Abonnement, Classe, Etablissement, Filiere


@receiver(post_save, sender=Abonnement)
@receiver(post_delete, sender=Abonnement)
def abonnement_modifie(sender, instance, **kwargs):
    notifier("admin_abonnements")


@receiver(post_save, sender=Etablissement)
@receiver(post_delete, sender=Etablissement)
def etablissement_modifie(sender, instance, **kwargs):
    notifier("admin_etablissements")


@receiver(post_save, sender=Classe)
@receiver(post_delete, sender=Classe)
@receiver(post_save, sender=Filiere)
@receiver(post_delete, sender=Filiere)
def classe_ou_filiere_modifiee(sender, instance, **kwargs):
    notifier("etablissement_classes")
