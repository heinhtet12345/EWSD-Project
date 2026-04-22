from datetime import date, datetime, time, timedelta
import random

from django.core.management.base import BaseCommand, CommandError
from django.db import transaction
from django.utils import timezone

from api.IdeaPost.models import Idea
from api.closure_period.models import ClosurePeriod
from api.interaction.models import Comment, Vote
from api.models import Category, Department, Role, User


RNG = random.Random(20260326)

QUARTER_STARTS = [
    date(2023, 10, 1),
    date(2024, 1, 1),
    date(2024, 4, 1),
    date(2024, 7, 1),
    date(2024, 10, 1),
    date(2025, 1, 1),
    date(2025, 4, 1),
    date(2025, 7, 1),
    date(2025, 10, 1),
    date(2026, 1, 1),
]

DEPARTMENT_ALIASES = {
    "Academic Affairs Department": "Academic Affairs",
    "Student Support Services": "Student Support",
    "Quality Assurance & Evaluation": "Quality Assurance",
    "Teacher Development & Training": "Teacher Development",
    "Curriculum Development Department": "Curriculum Dev",
}

IDEA_TOPICS = [
    "Feedback Portal",
    "Curriculum Review",
    "Training Support",
    "Digital Forms",
    "Student Outreach",
    "Teaching Toolkit",
    "Mentoring Process",
    "Resource Access",
]

IDEA_OPENING_LINES = [
    "This proposal focuses on improving the day-to-day experience for staff and students.",
    "The current workflow could be simplified with a small but meaningful process change.",
    "This idea is intended to improve coordination, transparency, and service quality.",
    "The department could benefit from a more consistent and measurable approach.",
]

COMMENT_TEMPLATES = [
    "This is practical and would be easy to pilot in our department.",
    "I support this idea, especially if we can roll it out in phases.",
    "The proposal is useful, but we should define ownership clearly.",
    "It would help to add a short training session before implementation.",
    "This solves a real issue we have been seeing for a while.",
]


def make_aware_datetime(target_date: date, hour: int, minute: int) -> datetime:
    return timezone.make_aware(datetime.combine(target_date, time(hour=hour, minute=minute)))


def build_academic_year_label(start_date: date) -> str:
    return f"{start_date.year}-{start_date.year + 1} {start_date.strftime('%b')}"


def normalized_role_name(user: User) -> str:
    role_name = getattr(getattr(user, "role", None), "role_name", "") or ""
    return role_name.strip().lower().replace(" ", "_")


def build_closure_dates(start_date: date, today: date) -> tuple[date, date]:
    if start_date == QUARTER_STARTS[-1]:
        idea_closure_date = max(today + timedelta(days=18), start_date + timedelta(days=70))
        comment_closure_date = idea_closure_date + timedelta(days=28)
    else:
        idea_closure_date = start_date + timedelta(days=45)
        comment_closure_date = start_date + timedelta(days=75)
    return idea_closure_date, comment_closure_date


def build_idea_title(department_name: str, period_label: str, staff_index: int, period_index: int) -> str:
    alias = DEPARTMENT_ALIASES.get(department_name, department_name[:18])
    month_label = period_label.split()[-1]
    topic = IDEA_TOPICS[(staff_index + period_index) % len(IDEA_TOPICS)]
    return f"{alias} {month_label} {topic}"[:50]


def build_idea_content(department_name: str, title: str, period_label: str, staff_index: int) -> str:
    opening = IDEA_OPENING_LINES[staff_index % len(IDEA_OPENING_LINES)]
    return (
        f"{opening} In {department_name}, the proposal '{title}' is prepared for the {period_label} "
        "closure period. It outlines a realistic improvement plan, the expected benefit for staff and "
        "students, and a simple path for implementation and review."
    )


class Command(BaseCommand):
    help = "Seed closure periods with ideas, comments, and votes for analytics and testing"

    def handle(self, *args, **kwargs):
        staff_role = Role.objects.filter(role_name__iexact="Staff").first()
        coordinator_role = Role.objects.filter(role_name__iexact="Qa Coordinator").first()

        if not staff_role or not coordinator_role:
            raise CommandError("Run seed_data first so Staff and QA Coordinator roles exist.")

        categories = list(Category.objects.order_by("category_id"))
        departments = list(Department.objects.order_by("dept_name"))
        if len(categories) < 3:
            raise CommandError("At least 3 categories are required. Run seed_data first.")
        if len(departments) != 5:
            raise CommandError("Expected 5 departments from seed_data before seeding closure activity.")

        staff_users = list(
            User.objects.select_related("department", "role")
            .filter(role=staff_role, department__isnull=False, active_status=True)
            .order_by("department__dept_name", "username")
        )
        coordinators = list(
            User.objects.select_related("department", "role")
            .filter(role=coordinator_role, department__isnull=False, active_status=True)
            .order_by("department__dept_name", "username")
        )
        if len(staff_users) < 50:
            raise CommandError("Expected 50 staff accounts from seed_data before seeding closure activity.")
        if len(coordinators) < 5:
            raise CommandError("Expected 5 QA coordinators from seed_data before seeding closure activity.")

        staff_by_department: dict[int, list[User]] = {}
        for user in staff_users:
            staff_by_department.setdefault(user.department_id, []).append(user)

        coordinator_by_department = {user.department_id: user for user in coordinators}
        today = timezone.now().date()

        created_closure_count = 0
        created_idea_count = 0
        created_comment_count = 0
        created_vote_count = 0

        with transaction.atomic():
            for period_index, start_date in enumerate(QUARTER_STARTS):
                academic_year = build_academic_year_label(start_date)
                idea_closure_date, comment_closure_date = build_closure_dates(start_date, today)
                is_current_period = start_date == QUARTER_STARTS[-1]

                closure_period = ClosurePeriod.objects.filter(academic_year=academic_year).first()
                if closure_period is None:
                    closure_period = ClosurePeriod.objects.create(
                        academic_year=academic_year,
                        idea_closure_date=idea_closure_date,
                        comment_closure_date=comment_closure_date,
                        is_active=is_current_period,
                    )
                    created_closure_count += 1

                ClosurePeriod.objects.filter(pk=closure_period.pk).update(
                    start_date=start_date,
                    idea_closure_date=idea_closure_date,
                    comment_closure_date=comment_closure_date,
                    is_active=is_current_period,
                )
                closure_period.refresh_from_db()

                for department in departments:
                    department_staff = staff_by_department.get(department.dept_id, [])
                    department_coordinator = coordinator_by_department.get(department.dept_id)
                    if not department_staff or not department_coordinator:
                        continue

                    voters_pool = department_staff + [department_coordinator]

                    for staff_index, author in enumerate(department_staff):
                        title = build_idea_title(department.dept_name, academic_year, staff_index, period_index)
                        idea = Idea.objects.filter(
                            user=author,
                            department=department,
                            closurePeriod=closure_period,
                            idea_title=title,
                        ).first()

                        if idea is None:
                            idea = Idea.objects.create(
                                idea_title=title,
                                idea_content=build_idea_content(department.dept_name, title, academic_year, staff_index),
                                anonymous_status=((staff_index + period_index) % 4 == 0),
                                terms_accepted=True,
                                user=author,
                                department=department,
                                closurePeriod=closure_period,
                            )
                            created_idea_count += 1

                        category_start = (period_index + staff_index) % len(categories)
                        category_count = 2 + ((period_index + staff_index) % 2)
                        selected_categories = [
                            categories[(category_start + offset) % len(categories)]
                            for offset in range(category_count)
                        ]
                        idea.categories.set(selected_categories)

                        submit_date = min(start_date + timedelta(days=(staff_index % 18) + 1), idea_closure_date - timedelta(days=1))
                        submit_datetime = make_aware_datetime(submit_date, 9 + (staff_index % 7), 10 + (period_index % 40))
                        Idea.objects.filter(pk=idea.pk).update(submit_datetime=submit_datetime)
                        idea.refresh_from_db()

                        if (staff_index + period_index) % 5 != 0:
                            comment_total = 1 + ((staff_index + period_index) % 3)
                            for comment_index in range(comment_total):
                                commenter = voters_pool[(staff_index + comment_index + 1) % len(voters_pool)]
                                if commenter.user_id == author.user_id:
                                    commenter = department_coordinator

                                comment_text = (
                                    f"{COMMENT_TEMPLATES[(comment_index + period_index) % len(COMMENT_TEMPLATES)]} "
                                    f"[{academic_year} #{staff_index + 1}-{comment_index + 1}]"
                                )
                                comment = Comment.objects.filter(
                                    idea=idea,
                                    user=commenter,
                                    cmt_content=comment_text,
                                ).first()
                                if comment is None:
                                    comment = Comment.objects.create(
                                        cmt_content=comment_text[:256],
                                        anonymous_status=((comment_index + staff_index) % 4 == 0),
                                        user=commenter,
                                        idea=idea,
                                    )
                                    created_comment_count += 1

                                base_comment_date = submit_date + timedelta(days=comment_index + 2)
                                latest_comment_date = min(comment_closure_date - timedelta(days=1), today)
                                comment_date = min(base_comment_date, latest_comment_date)
                                comment_datetime = make_aware_datetime(
                                    comment_date,
                                    11 + (comment_index % 5),
                                    5 + ((staff_index + comment_index) % 45),
                                )
                                Comment.objects.filter(pk=comment.pk).update(cmt_datetime=comment_datetime)

                        vote_total = 3 + ((staff_index + period_index) % 5)
                        ordered_voters = voters_pool[staff_index:] + voters_pool[:staff_index]
                        for vote_index, voter in enumerate(ordered_voters):
                            if vote_index >= vote_total:
                                break
                            if voter.user_id == author.user_id:
                                continue

                            vote_type = Vote.VoteType.UPVOTE if (vote_index + staff_index + period_index) % 4 != 0 else Vote.VoteType.DOWNVOTE
                            vote, created = Vote.objects.get_or_create(
                                user=voter,
                                idea=idea,
                                defaults={"vote_type": vote_type},
                            )
                            if not created and vote.vote_type != vote_type:
                                vote.vote_type = vote_type
                                vote.save(update_fields=["vote_type"])
                            if created:
                                created_vote_count += 1

                            base_vote_date = submit_date + timedelta(days=vote_index + 1)
                            latest_vote_date = min(comment_closure_date - timedelta(days=1), today)
                            vote_date = min(base_vote_date, latest_vote_date)
                            vote_datetime = make_aware_datetime(
                                vote_date,
                                14 + (vote_index % 4),
                                8 + ((staff_index + vote_index) % 45),
                            )
                            Vote.objects.filter(pk=vote.pk).update(vote_datetime=vote_datetime)

        self.stdout.write(
            self.style.SUCCESS(
                "Closure activity seeding completed: "
                f"{created_closure_count} closure periods created, "
                f"{created_idea_count} ideas created, "
                f"{created_comment_count} comments created, "
                f"and {created_vote_count} votes created."
            )
        )
        self.stdout.write("Seeded 10 quarterly closure periods with the latest period active right now.")
