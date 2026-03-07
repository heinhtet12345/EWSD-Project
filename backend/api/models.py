import uuid
from django.db import models
from django.contrib.auth.models import AbstractUser
from django.conf import settings

class Department(models.Model):
    dept_id = models.AutoField(primary_key=True)
    dept_name = models.CharField(max_length=30, unique=True)

    def __str__(self):
        return self.dept_name

class Role(models.Model):
    role_id = models.AutoField(primary_key=True)
    role_name = models.CharField(max_length=30, unique=True)

    def __str__(self):
        return self.role_name

class User(AbstractUser):
    user_id = models.AutoField(primary_key=True)
    dob = models.DateField(null=True, blank=True)
    address = models.CharField(max_length=256, blank=True)
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
        upload_to='profile_images/',
        null=True,
        blank=True
    )

    def __str__(self):
        return self.username

class Category(models.Model):
    category_id = models.AutoField(primary_key=True)
    category_name = models.CharField(max_length=30, unique=True)
    category_desc = models.CharField(max_length=256,)

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
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.title} -> {self.recipient}"



