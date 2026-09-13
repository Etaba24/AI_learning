from django.db import migrations


def seed_outil_chimie(apps, schema_editor):
    Outil = apps.get_model('trainings', 'Outil')
    Outil.objects.get_or_create(code='CHIMIE_3D')


def unseed_outil_chimie(apps, schema_editor):
    Outil = apps.get_model('trainings', 'Outil')
    Outil.objects.filter(code='CHIMIE_3D').delete()


class Migration(migrations.Migration):

    dependencies = [
        ('trainings', '0007_alter_outil_code_chimie'),
    ]

    operations = [
        migrations.RunPython(seed_outil_chimie, unseed_outil_chimie),
    ]
