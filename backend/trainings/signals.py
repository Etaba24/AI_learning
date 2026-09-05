from django.db.models.signals import post_delete, post_save
from django.dispatch import receiver

from core.realtime import notifier

from .models import Category, Formation


@receiver(post_save, sender=Formation)
@receiver(post_delete, sender=Formation)
def formation_modifiee(sender, instance, **kwargs):
    notifier("admin_dashboard")
    notifier("admin_formations")
    notifier("instructor_formations")
    notifier("catalogue")


@receiver(post_save, sender=Category)
@receiver(post_delete, sender=Category)
def categorie_modifiee(sender, instance, **kwargs):
    notifier("admin_categories")
