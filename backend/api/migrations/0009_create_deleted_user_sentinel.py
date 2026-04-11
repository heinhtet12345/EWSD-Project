from django.contrib.auth.hashers import make_password
from django.db import migrations


def create_deleted_user_sentinel(apps, schema_editor):
    User = apps.get_model("api", "User")

    User.objects.update_or_create(
        user_id=0,
        defaults={
            "username": "deleted_user",
            "email": "deleted_user@system.local",
            "first_name": "Deleted",
            "last_name": "User",
            "is_staff": False,
            "is_superuser": False,
            "is_active": False,
            "active_status": False,
            "password": make_password(None),
        },
    )


def remove_deleted_user_sentinel(apps, schema_editor):
    User = apps.get_model("api", "User")
    User.objects.filter(user_id=0, username="deleted_user").delete()


class Migration(migrations.Migration):

    dependencies = [
        ("api", "0008_alter_user_options"),
    ]

    operations = [
        migrations.RunPython(create_deleted_user_sentinel, remove_deleted_user_sentinel),
    ]
