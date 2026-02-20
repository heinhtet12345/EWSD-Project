from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from django.contrib.auth.models import Group
from api.models import Role  # Import your new Role and Category models
from api.models import Department  # Import your new Department model

User = get_user_model()

class Command(BaseCommand):
    help = "Seed database with ERD-compliant Departments, Roles, and Custom Users"

    def handle(self, *args, **kwargs):
        # 1. Create Departments (Required by ERD)
        # Based on the ERD, every user needs a dept_name
        depts_data = [
            {"name": "Information Technology"},
            {"name": "Academic Support"},
        ]
        
        dept_objects = {}
        for d in depts_data:
            dept, _ = Department.objects.get_or_create(
                dept_name=d["name"] 
            )
            dept_objects[d["name"]] = dept
            self.stdout.write(f"Ensured Department: {d['name']}")

        # 2. Create Roles/Groups
        role_objects = {}
        for role_name in ["Admin", "QA_Coordinator", "QA_Manager", "Staff"]:
            role_obj, _ = Role.objects.get_or_create(role_name=role_name)
            role_objects[role_name] = role_obj

        # 3. Define Test Users with ERD-specific fields
        # Format: (username, password, role, dept_name, extra_fields)
        test_users = [
            ("admin", "pass123", "Admin", "Information Technology", {"phone": "111-222"}),
            ("QAcoordinator", "pass123", "QA_Coordinator", "Information Technology", {"phone": "333-444"}),
            ("QAmanager", "pass123", "QA_Manager", "Academic Support", {"phone": "555-666"}),
            ("StaffUser", "pass123", "Staff", "Academic Support", {"phone": "777-888"}),
        ]

        for username, password, role_name, dept_name, extras in test_users:
            if not User.objects.filter(username=username).exists():
                # Create Custom User with Foreign Key to Department
                user = User.objects.create_user(
                    username=username,
                    password=password,
                    department=dept_objects[dept_name],  # Linking to Department model
                    role=role_objects[role_name], 
                    address="University Campus",  # ERD field
                    active_status=True,           # ERD field
                    **extras                      # Spreads the 'phone' etc.
                )
                
                
                self.stdout.write(self.style.SUCCESS(
                    f"Created {username} in {dept_name} with role {role_name}"
                ))
            else:
                self.stdout.write(self.style.WARNING(f"User {username} already exists."))

        self.stdout.write(self.style.SUCCESS("ERD-compliant seeding completed!"))