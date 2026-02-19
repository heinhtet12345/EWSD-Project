from django.db import models
from django.contrib.auth.models import User

class Profile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE)
    profile_image = models.ImageField(upload_to='profile_images/', null=True, blank=True)

    dob = models.DateField(null=True, blank=True)
    address = models.CharField(max_length=256, null=True, blank=True)
    phone = models.CharField(max_length=20, null=True, blank=True)
    hire_date = models.DateField(null=True, blank=True)
    active_status = models.BooleanField(default=True)

    department = models.ForeignKey(
        'Department',
        on_delete=models.SET_NULL,
        null=True,
        blank=True
    )
    def __str__(self):
        return self.user.username

class Category(models.Model):
    category_name = models.CharField(max_length=30, unique=True)
    category_desc = models.CharField(max_length=256,)

    def __str__(self):
        return self.category_name

class Department(models.Model):
    dept_name = models.CharField(max_length=30, unique=True)

    def __str__(self):
        return self.dept_name
