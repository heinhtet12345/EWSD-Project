from datetime import datetime, timedelta

from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand, CommandError
from django.utils import timezone

from api.analytics.models import ActivityLog

User = get_user_model()


BROWSERS = ["Chrome", "Edge", "Firefox", "Safari"]
PLATFORMS = [
    ("Windows", "Desktop"),
    ("macOS", "Desktop"),
    # ("Android", "Mobile"),
    # ("iOS", "Mobile"),
]

ROLE_PATHS = {
    "admin": [
        "/admin",
        "/admin/users",
        "/admin/departments",
        "/admin/analytics",
        "/admin/reports",
    ],
    "qa_manager": [
        "/qa_manager",
        "/qa_manager/all-ideas",
        "/qa_manager/users",
        "/qa_manager/categories",
        "/qa_manager/closure-period",
        "/qa_manager/reports",
    ],
    "qa_coordinator": [
        "/qa_coordinator",
        "/qa_coordinator/all-ideas",
        "/qa_coordinator/department-ideas",
        "/qa_coordinator/profile",
    ],
    "staff": [
        "/staff",
        "/staff/all-ideas",
        "/staff/my-ideas",
        "/staff/profile",
        "/staff/notifications",
    ],
}

EVENT_TYPES = ["page_view", "login", "idea_view", "idea_vote", "comment"]


def normalized_role_name(user) -> str:
    role_name = getattr(getattr(user, "role", None), "role_name", "") or ""
    return role_name.strip().lower().replace(" ", "_")


def build_timestamp(base_time, day_offset: int, step_index: int):
    return base_time - timedelta(days=day_offset, minutes=step_index * 3 + day_offset * 7)


def build_event_path(role: str, event_type: str, path_index: int) -> str:
    role_paths = ROLE_PATHS.get(role, ["/"])
    if event_type == "login":
        return "/api/login/"
    if event_type == "idea_view":
        return f"{role_paths[min(1, len(role_paths) - 1)]}?idea={100 + path_index}"
    if event_type == "idea_vote":
        return f"/api/ideas/{100 + path_index}/vote/"
    if event_type == "comment":
        return f"/api/ideas/{100 + path_index}/comments/"
    return role_paths[path_index % len(role_paths)]


class Command(BaseCommand):
    help = "Seed activity logs for existing users"

    def handle(self, *args, **kwargs):
        users = list(User.objects.select_related("role").order_by("username"))
        if not users:
            raise CommandError("No users found. Run seed_data first.")

        now = timezone.now()
        created_count = 0

        for user_index, user in enumerate(users):
            role = normalized_role_name(user)
            if not role:
                continue

            activity_count = 4 + ((user_index * 3) % 9)
            if role == "staff":
                activity_count += user_index % 5
            elif role == "qa_manager":
                activity_count += 8
            elif role == "admin":
                activity_count += 5

            browser = BROWSERS[user_index % len(BROWSERS)]
            operating_system, device_type = PLATFORMS[user_index % len(PLATFORMS)]

            for activity_index in range(activity_count):
                event_type = EVENT_TYPES[(user_index + activity_index) % len(EVENT_TYPES)]
                if role == "admin" and event_type == "page_view":
                    event_type = "login"

                path = build_event_path(role, event_type, activity_index + user_index)
                created_at = build_timestamp(now, user_index % 18, activity_index)

                log = ActivityLog.objects.filter(
                    user=user,
                    event_type=event_type,
                    path=path,
                    created_at=created_at,
                ).first()
                if log:
                    continue

                log = ActivityLog.objects.create(
                    user=user,
                    event_type=event_type,
                    path=path[:255],
                    browser=browser,
                    operating_system=operating_system,
                    device_type=device_type,
                    metadata={
                        "seeded": True,
                        "role": role,
                    },
                )
                ActivityLog.objects.filter(pk=log.pk).update(created_at=created_at)
                created_count += 1

        self.stdout.write(self.style.SUCCESS(f"Seeded {created_count} activity logs for existing users."))
