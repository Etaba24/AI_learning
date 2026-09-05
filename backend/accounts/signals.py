"""Déclenche les notifications temps réel (core.realtime) quand un compte
change — indépendamment du chemin de code emprunté (vue admin, import en
masse établissement, shell...), contrairement à un appel manuel par vue qui
risquerait d'en oublier un."""

from django.db.models.signals import post_delete, post_save
from django.dispatch import receiver

from core.realtime import notifier

from .models import User


@receiver(post_save, sender=User)
@receiver(post_delete, sender=User)
def utilisateur_modifie(sender, instance, **kwargs):
    notifier("admin_dashboard")
    notifier("admin_users")
    if instance.etablissement_id:
        notifier("etablissement_membres")
