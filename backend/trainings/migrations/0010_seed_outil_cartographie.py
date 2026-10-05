from django.db import migrations


def seed_outil_cartographie(apps, schema_editor):
    Outil = apps.get_model('trainings', 'Outil')
    Outil.objects.get_or_create(code='CARTOGRAPHIE')


def unseed_outil_cartographie(apps, schema_editor):
    Outil = apps.get_model('trainings', 'Outil')
    Outil.objects.filter(code='CARTOGRAPHIE').delete()


class Migration(migrations.Migration):

    dependencies = [
        ('trainings', '0009_alter_outil_code'),
    ]

    operations = [
        migrations.RunPython(seed_outil_cartographie, unseed_outil_cartographie),
    ]
