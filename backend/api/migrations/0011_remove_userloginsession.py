from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ("api", "0010_userloginsession"),
    ]

    operations = [
        migrations.DeleteModel(
            name="UserLoginSession",
        ),
    ]
