from django.contrib import admin
from api.models import Department
from django.contrib.auth.admin import UserAdmin
from api.models import User
from api.models import Role, Category


# Register your models here.
class CustomUserAdmin(UserAdmin):
    # Add custom fields to the admin form
    fieldsets = UserAdmin.fieldsets + (
        ("Custom Info", {
            "fields": ("dob", "address", "phone", "hire_date", "active_status", "role", "department", "profile_image"),
        }),
    )
    list_display = ["username", "email", "dob", "address", "phone", "hire_date", "active_status", "role", "department"]

admin.site.register(User, CustomUserAdmin)
admin.site.register(Role)
admin.site.register(Category)
admin.site.register(Department)