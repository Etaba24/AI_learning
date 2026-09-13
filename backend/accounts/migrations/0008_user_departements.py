import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('accounts', '0007_user_categories_interet'),
        ('core', '0002_departement'),
    ]

    operations = [
        migrations.AddField(
            model_name='user',
            name='departements',
            field=models.ManyToManyField(blank=True, related_name='formateurs_m2m', to='core.departement'),
        ),
    ]
