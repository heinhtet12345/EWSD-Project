from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand, CommandError
from django.db import transaction


User = get_user_model()


USER_IDS = [12, 30, 18, 56, 46, 14, 30, 55, 45, 24]


class Command(BaseCommand):
    help = "Seed placeholder profile_image paths for specific users"

    def handle(self, *args, **options):
        missing_user_ids: list[int] = []
        updated_count = 0

        with transaction.atomic():
            for user_id in sorted(set(USER_IDS)):
                user = User.objects.filter(pk=user_id).first()
                if not user:
                    missing_user_ids.append(user_id)
                    continue

                target_path = f"profile_image/user_{user_id}.jpg"
                if str(user.profile_image or "") != target_path:
                    user.profile_image = target_path
                    user.save(update_fields=["profile_image"])
                    updated_count += 1

        if missing_user_ids:
            missing = ", ".join(str(user_id) for user_id in missing_user_ids)
            raise CommandError(f"These user IDs were not found: {missing}")

        self.stdout.write(self.style.SUCCESS("Profile image paths seeded successfully."))
        self.stdout.write(f"Users updated: {updated_count}")
