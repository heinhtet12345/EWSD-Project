from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ("closure_period", "0002_alter_closureperiod_id"),
    ]

    operations = [
        migrations.AlterModelTable(
            name="closureperiod",
            table="ClosurePeriod",
        ),
    ]
