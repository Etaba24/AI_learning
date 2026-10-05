from django.db import migrations


def seed_outil_arduino(apps, schema_editor):
    Outil = apps.get_model('trainings', 'Outil')
    Outil.objects.get_or_create(code='ARDUINO')


def unseed_outil_arduino(apps, schema_editor):
    Outil = apps.get_model('trainings', 'Outil')
    Outil.objects.filter(code='ARDUINO').delete()


class Migration(migrations.Migration):

    dependencies = [
        ('trainings', '0011_alter_outil_code'),
    ]

    operations = [
        migrations.RunPython(seed_outil_arduino, unseed_outil_arduino),
    ]
