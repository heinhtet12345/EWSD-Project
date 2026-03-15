from django.conf import settings
from django.db import models


class ActivityLog(models.Model):
    activity_log_id = models.AutoField(primary_key=True)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="activity_logs",
    )
    event_type = models.CharField(max_length=50, default="page_view", db_index=True)
    path = models.CharField(max_length=255, db_index=True)
    browser = models.CharField(max_length=100, blank=True, default="")
    operating_system = models.CharField(max_length=100, blank=True, default="")
    device_type = models.CharField(max_length=50, blank=True, default="")
    metadata = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["created_at", "event_type"]),
            models.Index(fields=["user", "created_at"]),
            models.Index(fields=["path", "created_at"]),
        ]

    def __str__(self):
        return f"{self.event_type}: {self.path}"
