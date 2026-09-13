from django.db import migrations


def migrer_departement_unique_vers_m2m(apps, schema_editor):
    User = apps.get_model('accounts', 'User')
    for user in User.objects.exclude(departement__isnull=True):
        user.departements.add(user.departement_id)


def revenir_en_arriere(apps, schema_editor):
    """Best-effort : si jamais un formateur a plusieurs départements au
    moment du rollback, un seul (le premier) peut être réassigné au champ
    FK unique — perte d'information assumée, propre à une opération de
    rollback (jamais exécutée en fonctionnement normal)."""
    User = apps.get_model('accounts', 'User')
    for user in User.objects.all():
        premier = user.departements.first()
        if premier:
            user.departement_id = premier.id
            user.save(update_fields=['departement'])


class Migration(migrations.Migration):

    dependencies = [
        ('accounts', '0008_user_departements'),
    ]

    operations = [
        migrations.RunPython(migrer_departement_unique_vers_m2m, revenir_en_arriere),
    ]
