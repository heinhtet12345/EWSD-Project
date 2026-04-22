from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion
import uuid


class Migration(migrations.Migration):

    dependencies = [
        ("api", "0009_create_deleted_user_sentinel"),
    ]

    operations = [
        migrations.CreateModel(
            name="UserLoginSession",
            fields=[
                ("session_id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ("refresh_jti", models.CharField(max_length=255, unique=True)),
                ("refresh_token", models.TextField()),
                ("device_type", models.CharField(blank=True, max_length=30)),
                ("browser", models.CharField(blank=True, max_length=50)),
                ("operating_system", models.CharField(blank=True, max_length=50)),
                ("ip_address", models.GenericIPAddressField(blank=True, null=True)),
                ("user_agent", models.TextField(blank=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("last_used_at", models.DateTimeField(auto_now=True)),
                ("revoked_at", models.DateTimeField(blank=True, null=True)),
                (
                    "user",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="login_sessions",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
            ],
            options={
                "db_table": "UserLoginSession",
                "ordering": ["-last_used_at", "-created_at"],
            },
        ),
    ]
