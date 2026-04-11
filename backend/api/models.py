import uuid
from django.db import models
from django.contrib.auth.models import AbstractUser
from django.conf import settings

class Department(models.Model):
    dept_id = models.AutoField(primary_key=True)
    dept_name = models.CharField(max_length=100, unique=True)

    class Meta:
        db_table = "Department"

    def __str__(self):
        return self.dept_name

class Role(models.Model):
    role_id = models.AutoField(primary_key=True)
    role_name = models.CharField(max_length=30, unique=True)

    class Meta:
        db_table = "Role"

    def __str__(self):
        return self.role_name

class User(AbstractUser):
    user_id = models.AutoField(primary_key=True)
    dob = models.DateField(null=True, blank=True)
    address_line_1 = models.CharField(max_length=256, blank=True)
    township = models.CharField(max_length=100, blank=True)
    city = models.CharField(max_length=100, blank=True)
    postal_code = models.CharField(max_length=20, blank=True)
    phone = models.CharField(max_length=20, blank=True)
    hire_date = models.DateField(null=True, blank=True)
    active_status = models.BooleanField(default=True)

    department = models.ForeignKey(
        'Department',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='users'
    )

    role = models.ForeignKey(
        'Role',
        on_delete=models.SET_NULL,
        null=True,
        blank=True
    )

    profile_image = models.ImageField(
        upload_to='profile_image/',
        null=True,
        blank=True
    )

    class Meta:
        db_table = "User"

    def __str__(self):
        return self.username

class Category(models.Model):
    category_id = models.AutoField(primary_key=True)
    category_name = models.CharField(max_length=30, unique=True)
    category_desc = models.CharField(max_length=256,)

    class Meta:
        db_table = "Category"

    def __str__(self):
        return self.category_name


class Notification(models.Model):
    notification_id = models.AutoField(primary_key=True)
    recipient = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='notifications'
    )
    title = models.CharField(max_length=120)
    message = models.TextField()
    notification_type = models.CharField(max_length=50, default='general')
    is_read = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    idea = models.ForeignKey(
        'IdeaPost.Idea',
        on_delete=models.CASCADE,
        related_name='notifications',
        null=True,
        blank=True
    )

    class Meta:
        db_table = "Notification"
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.title} -> {self.recipient}"


class UserLoginSession(models.Model):
    session_id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="login_sessions",
    )
    refresh_jti = models.CharField(max_length=255, unique=True)
    refresh_token = models.TextField()
    device_type = models.CharField(max_length=30, blank=True)
    browser = models.CharField(max_length=50, blank=True)
    operating_system = models.CharField(max_length=50, blank=True)
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    last_used_at = models.DateTimeField(auto_now=True)
    revoked_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = "UserLoginSession"
        ordering = ["-last_used_at", "-created_at"]

    @property
    def is_active(self) -> bool:
        return self.revoked_at is None

    def __str__(self):
        return f"{self.user} - {self.browser or 'Unknown Browser'} ({self.device_type or 'Unknown Device'})"



