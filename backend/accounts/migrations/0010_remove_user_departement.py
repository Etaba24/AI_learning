from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('accounts', '0009_migrer_departement_vers_departements'),
    ]

    operations = [
        migrations.RemoveField(
            model_name='user',
            name='departement',
        ),
        migrations.AlterField(
            model_name='user',
            name='departements',
            field=models.ManyToManyField(blank=True, related_name='formateurs', to='core.departement'),
        ),
    ]
