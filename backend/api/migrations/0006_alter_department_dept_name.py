from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("api", "0005_remove_user_apartment_remove_user_street_address_and_more"),
    ]

    operations = [
        migrations.AlterField(
            model_name="department",
            name="dept_name",
            field=models.CharField(max_length=100, unique=True),
        ),
    ]
