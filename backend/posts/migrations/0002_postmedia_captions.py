# Generated migration for adding captions field to PostMedia

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('posts', '0001_initial'),  # Adjust this to your last migration
    ]

    operations = [
        migrations.AddField(
            model_name='postmedia',
            name='captions',
            field=models.JSONField(blank=True, default=list, help_text='Video captions with timestamps', null=True),
        ),
    ]
