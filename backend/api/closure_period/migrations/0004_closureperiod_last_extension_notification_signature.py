from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("closure_period", "0003_rename_closureperiod_table"),
    ]

    operations = [
        migrations.AddField(
            model_name="closureperiod",
            name="last_extension_notification_signature",
            field=models.CharField(blank=True, default="", max_length=128),
        ),
    ]
