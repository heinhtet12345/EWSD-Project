from django.conf import settings
from django.db import models


class Announcement(models.Model):
    a_id = models.AutoField(primary_key=True)
    posted_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="announcements",
    )
    a_title = models.CharField(max_length=200)
    a_content = models.TextField()
    posted_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    is_active = models.BooleanField(default=True)

    class Meta:
        db_table = "Announcement"
        ordering = ["-posted_at", "-a_id"]

    def __str__(self):
        return self.a_title

