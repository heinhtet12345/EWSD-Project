from django.core.management.base import BaseCommand
from django.contrib.auth.models import User, Group
from api.models import Profile

class Command(BaseCommand):
    help = "Seed database with specific QA roles and users"

    def handle(self, *args, **kwargs):
        # 1. Defining the roles
        roles = ["Admin", "QA_Coordinator", "QA_Manager", "Staff"]
        group_objects = {}

        for role in roles:
            group, _ = Group.objects.get_or_create(name=role)
            group_objects[role] = group

        # Format: (username, password, role_name)
        test_users = [
            ("admin", "pass123", "Admin"),
            ("QAcoordinator", "pass123", "QA_Coordinator"),
            ("QAmanager", "pass123", "QA_Manager"),
            ("Staff", "pass123", "Staff"),
        ]

        for username, password, role_name in test_users:
            if not User.objects.filter(username=username).exists():
                #create users and assign roles
                user = User.objects.create_user(username=username, password=password)
                user.groups.add(group_objects[role_name])
                Profile.objects.create(user=user)
                
                self.stdout.write(self.style.SUCCESS(f"Created {username} with role {role_name}"))
            else:
                self.stdout.write(self.style.WARNING(f"User {username} already exists. Skipping."))

        self.stdout.write(self.style.SUCCESS("Database seeding completed successfully!"))