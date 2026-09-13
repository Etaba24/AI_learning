from django.db import migrations


# Historique : les migrations de données ne voient pas les TextChoices du
# vrai modèle (seulement l'état figé des champs), donc la liste est répétée
# ici en dur plutôt que de référencer trainings.models.Outil.Code.
CODES = ['IDE', 'TABLEUR', 'NOTES', 'CALCULATRICE', 'TABLEAU_BLANC', 'MODELISATION_3D']


def seed_outils(apps, schema_editor):
    Outil = apps.get_model('trainings', 'Outil')
    for code in CODES:
        Outil.objects.get_or_create(code=code)


def unseed_outils(apps, schema_editor):
    Outil = apps.get_model('trainings', 'Outil')
    Outil.objects.all().delete()


class Migration(migrations.Migration):

    dependencies = [
        ('trainings', '0005_outil_category_outils_associes'),
    ]

    operations = [
        migrations.RunPython(seed_outils, unseed_outils),
    ]
