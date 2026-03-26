from datetime import date, datetime, time, timedelta

from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand, CommandError
from django.db import transaction
from django.utils import timezone

from api.IdeaPost.models import Idea
from api.closure_period.models import ClosurePeriod
from api.interaction.models import Comment, Vote
from api.models import Category, Department

User = get_user_model()


IDEA_TITLE_STARTERS = [
    "Improve",
    "Strengthen",
    "Expand",
    "Refresh",
    "Modernize",
    "Support",
    "Enhance",
    "Simplify",
]

TITLE_QUALIFIERS = [
    "workflow",
    "initiative",
    "pilot",
    "review",
    "plan",
    "framework",
    "program",
    "proposal",
]

IDEA_SUBJECTS = [
    "student feedback workflows",
    "course material access",
    "department communication",
    "digital learning support",
    "staff collaboration practices",
    "academic advising touchpoints",
    "campus service response times",
    "training follow-up activities",
]

IDEA_CONTENT_TEMPLATES = [
    "This idea focuses on {subject} in the {department} and aims to make the experience more consistent for both staff and students.",
    "Our team in {department} could benefit from a structured approach to {subject} so day-to-day work becomes easier to manage.",
    "A practical improvement for {department} would be to review {subject} and introduce a clearer, repeatable process.",
    "This proposal suggests that {department} should invest more attention in {subject} to improve service quality and visibility.",
]

IDEA_ACTIONS = [
    "introduce a lightweight review step",
    "standardize follow-up communication",
    "pilot a shared digital tracker",
    "set clearer ownership between teams",
    "create a monthly check-in routine",
    "refresh outdated guidance and forms",
]

IDEA_CHALLENGES = [
    "response times vary too much between teams",
    "staff rely on informal workarounds",
    "students receive inconsistent updates",
    "manual tracking makes trend analysis difficult",
    "feedback is collected but not reviewed consistently",
    "good practices are not shared widely enough",
]

IDEA_OUTCOMES = [
    "better visibility for managers and coordinators",
    "more predictable support for students",
    "stronger quality assurance follow-up",
    "faster issue escalation when something slips",
    "clearer evidence for future departmental reviews",
    "more balanced workload across the team",
]

COMMENT_TEMPLATES = [
    "This is practical and could be piloted first within the department.",
    "I support this direction because it would reduce confusion for staff.",
    "This could work well if we pair it with a simple rollout plan.",
    "The idea is strong, but it may need clear ownership to sustain it.",
    "This would help a lot during busy periods when response times slip.",
    "I like this suggestion and think it should be considered in the next review cycle.",
]

COMMENT_FOCUS_AREAS = [
    "the rollout timeline looks realistic",
    "the ownership model needs to stay simple",
    "this could reduce duplicated effort",
    "staff buy-in will matter for adoption",
    "the proposal fits the department's current priorities",
    "the implementation cost seems manageable",
]

QUARTER_START_DATES = [
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

MONTH_LABELS = {
    1: "Jan",
    4: "Apr",
    7: "Jul",
    10: "Oct",
}

DEPARTMENT_IDEA_BLUEPRINTS = {
    "Academic Affairs Department": {
        "title": "Improve Teaching Quality with Weekly Review",
        "content": (
            "Implement a weekly lesson review system where teachers submit lesson plans and receive feedback. "
            "This will ensure consistent teaching quality and better alignment with learning objectives."
        ),
    },
    "Student Support Services": {
        "title": "Student Wellbeing & Counseling Program",
        "content": (
            "Introduce a structured counseling program with monthly check-ins for students to support mental health, "
            "improve behavior, and enhance overall student engagement."
        ),
    },
    "Quality Assurance & Evaluation": {
        "title": "Monthly Performance Evaluation Dashboard",
        "content": (
            "Develop a dashboard to track student performance, teacher effectiveness, and department KPIs monthly "
            "to support data-driven decision making."
        ),
    },
    "Teacher Development & Training": {
        "title": "Monthly Teacher Training Workshops",
        "content": (
            "Organize monthly workshops focusing on modern teaching strategies, classroom management, and technology "
            "integration to continuously improve teacher skills."
        ),
    },
    "Curriculum Development Department": {
        "title": "Curriculum Update for Industry-Relevant Skills",
        "content": (
            "Review and update curriculum to include practical skills, digital tools, and real-world applications "
            "to better prepare students for future careers."
        ),
    },
}


def academic_year_label(start_date: date) -> str:
    if start_date.month in {10}:
        start_year = start_date.year
        end_year = start_date.year + 1
    else:
        start_year = start_date.year - 1
        end_year = start_date.year
    return f"{start_year}-{end_year} {MONTH_LABELS[start_date.month]}"


def build_period_dates(start_date: date, today: date) -> tuple[date, date, bool]:
    if start_date == QUARTER_START_DATES[-1]:
        return today + timedelta(days=18), today + timedelta(days=42), True
    return start_date + timedelta(days=64), start_date + timedelta(days=82), False


def set_created_datetime(instance, field_name: str, value: datetime) -> None:
    instance.__class__.objects.filter(pk=instance.pk).update(**{field_name: value})
    setattr(instance, field_name, value)


def is_non_participating_staff(department_index: int, staff_index: int) -> bool:
    return (department_index * 5 + staff_index) % 11 in {0, 7}


def planned_idea_count(department_index: int, staff_index: int, period_index: int) -> int:
    if is_non_participating_staff(department_index, staff_index):
        return 0

    score = (department_index * 4 + staff_index * 3 + period_index * 2) % 12
    if score in {0, 1, 2}:
        return 0
    if score in {9, 10, 11}:
        return 2
    return 1


def trim_title(base_title: str, suffix: str) -> str:
    available_length = max(1, 50 - len(suffix))
    return f"{base_title[:available_length].rstrip()}{suffix}"


def build_unique_idea_title(
    *,
    department_name: str,
    author,
    start_date: date,
    period_index: int,
    staff_index: int,
    idea_variant: int,
) -> str:
    blueprint = DEPARTMENT_IDEA_BLUEPRINTS.get(department_name)
    if idea_variant == 0 and blueprint:
        base_title = blueprint["title"]
    else:
        base_title = (
            f"{IDEA_TITLE_STARTERS[(period_index + staff_index + idea_variant) % len(IDEA_TITLE_STARTERS)]} "
            f"{TITLE_QUALIFIERS[(staff_index + idea_variant) % len(TITLE_QUALIFIERS)]} "
            f"{IDEA_SUBJECTS[(period_index + staff_index + idea_variant) % len(IDEA_SUBJECTS)]}"
        )

    suffix = (
        f" {MONTH_LABELS[start_date.month]}{str(start_date.year)[-2:]}"
        f" {author.first_name[:1]}{author.last_name[:1]}{idea_variant + 1}"
    )
    return trim_title(base_title, suffix)


def build_unique_idea_content(
    *,
    department_name: str,
    author,
    academic_year: str,
    period_index: int,
    staff_index: int,
    idea_variant: int,
) -> str:
    blueprint = DEPARTMENT_IDEA_BLUEPRINTS.get(department_name)
    if idea_variant == 0 and blueprint:
        opening = blueprint["content"]
    else:
        opening = IDEA_CONTENT_TEMPLATES[
            (period_index + staff_index + idea_variant) % len(IDEA_CONTENT_TEMPLATES)
        ].format(
            subject=IDEA_SUBJECTS[(period_index + staff_index + idea_variant) % len(IDEA_SUBJECTS)],
            department=department_name,
        )

    action = IDEA_ACTIONS[(staff_index + idea_variant) % len(IDEA_ACTIONS)]
    challenge = IDEA_CHALLENGES[(period_index + idea_variant) % len(IDEA_CHALLENGES)]
    outcome = IDEA_OUTCOMES[(period_index + staff_index + idea_variant) % len(IDEA_OUTCOMES)]

    return (
        f"{opening} During the {academic_year} period, {author.first_name} {author.last_name} is suggesting that "
        f"{department_name} should {action} because {challenge}. The expected result is {outcome}."
    )


def build_unique_comment_text(
    *,
    idea_title: str,
    department_name: str,
    commenter,
    academic_year: str,
    period_index: int,
    comment_index: int,
) -> str:
    opening = COMMENT_TEMPLATES[(period_index + comment_index) % len(COMMENT_TEMPLATES)]
    focus = COMMENT_FOCUS_AREAS[(period_index + comment_index + len(commenter.username)) % len(COMMENT_FOCUS_AREAS)]
    return (
        f"{opening} For '{idea_title}', {focus}. {commenter.first_name} noted this during the "
        f"{academic_year} review for {department_name}."
    )[:256]


class Command(BaseCommand):
    help = "Seed closure periods with ideas, comments, and votes"

    def handle(self, *args, **kwargs):
        departments = list(Department.objects.order_by("dept_name"))
        categories = list(Category.objects.order_by("category_id"))
        staff_users = list(
            User.objects.select_related("department", "role")
            .filter(role__role_name__iexact="staff", department__isnull=False)
            .order_by("department__dept_name", "username")
        )
        coordinators = list(
            User.objects.select_related("department", "role")
            .filter(role__role_name__iexact="qa coordinator", department__isnull=False)
            .order_by("department__dept_name", "username")
        )

        if not departments:
            raise CommandError("No departments found. Run seed_data first.")
        if not categories:
            raise CommandError("No categories found. Run seed_data first.")
        if not staff_users:
            raise CommandError("No staff users found. Run seed_data first.")

        staff_by_department: dict[int, list[User]] = {}
        for user in staff_users:
            staff_by_department.setdefault(user.department_id, []).append(user)

        coordinator_by_department = {user.department_id: user for user in coordinators}
        today = timezone.now().date()

        created_period_count = 0
        created_idea_count = 0
        created_comment_count = 0
        created_vote_count = 0

        with transaction.atomic():
            for period_index, start_date in enumerate(QUARTER_START_DATES):
                academic_year = academic_year_label(start_date)
                idea_closure_date, comment_closure_date, is_active = build_period_dates(start_date, today)

                closure_period, created = ClosurePeriod.objects.get_or_create(
                    academic_year=academic_year,
                    defaults={
                        "idea_closure_date": idea_closure_date,
                        "comment_closure_date": comment_closure_date,
                        "is_active": is_active,
                    },
                )

                closure_period.idea_closure_date = idea_closure_date
                closure_period.comment_closure_date = comment_closure_date
                closure_period.is_active = is_active
                closure_period.save(update_fields=["idea_closure_date", "comment_closure_date", "is_active"])
                ClosurePeriod.objects.filter(pk=closure_period.pk).update(start_date=start_date)
                closure_period.start_date = start_date

                if created:
                    created_period_count += 1

                for department_index, department in enumerate(departments):
                    department_staff = staff_by_department.get(department.dept_id, [])
                    if not department_staff:
                        continue

                    engaged_staff = [
                        user
                        for staff_index, user in enumerate(department_staff)
                        if not is_non_participating_staff(department_index, staff_index)
                    ]
                    coordinator = coordinator_by_department.get(department.dept_id)

                    for staff_index, staff_user in enumerate(department_staff):
                        idea_count = planned_idea_count(department_index, staff_index, period_index)
                        if idea_count == 0:
                            continue

                        for idea_variant in range(idea_count):
                            title = build_unique_idea_title(
                                department_name=department.dept_name,
                                author=staff_user,
                                start_date=start_date,
                                period_index=period_index,
                                staff_index=staff_index,
                                idea_variant=idea_variant,
                            )
                            content = build_unique_idea_content(
                                department_name=department.dept_name,
                                author=staff_user,
                                academic_year=academic_year,
                                period_index=period_index,
                                staff_index=staff_index,
                                idea_variant=idea_variant,
                            )
                            anonymous_status = (period_index + staff_index + idea_variant) % 4 == 0

                            idea, idea_created = Idea.objects.get_or_create(
                                user=staff_user,
                                closurePeriod=closure_period,
                                idea_title=title,
                                defaults={
                                    "idea_content": content,
                                    "anonymous_status": anonymous_status,
                                    "terms_accepted": True,
                                    "department": department,
                                },
                            )

                            if not idea_created:
                                changed_fields = []
                                if idea.idea_content != content:
                                    idea.idea_content = content
                                    changed_fields.append("idea_content")
                                if idea.anonymous_status != anonymous_status:
                                    idea.anonymous_status = anonymous_status
                                    changed_fields.append("anonymous_status")
                                if idea.department_id != department.dept_id:
                                    idea.department = department
                                    changed_fields.append("department")
                                if not idea.terms_accepted:
                                    idea.terms_accepted = True
                                    changed_fields.append("terms_accepted")
                                if changed_fields:
                                    idea.save(update_fields=changed_fields)

                            category_slice_start = (period_index + staff_index + department_index + idea_variant) % len(categories)
                            category_count = 1 + ((period_index + staff_index + idea_variant) % 3)
                            selected_categories = [
                                categories[(category_slice_start + offset * 5) % len(categories)]
                                for offset in range(category_count)
                            ]
                            idea.categories.set(selected_categories)

                            submit_offset = (staff_index * 3 + department_index + idea_variant * 4) % 28 + 1
                            submit_date = start_date + timedelta(days=submit_offset)
                            submit_dt = timezone.make_aware(
                                datetime.combine(submit_date, time(9 + ((staff_index + idea_variant) % 6), 10 + (period_index % 40)))
                            )
                            set_created_datetime(idea, "submit_datetime", submit_dt)

                            if idea_created:
                                created_idea_count += 1

                            engagement_score = (department_index * 2 + staff_index + period_index + idea_variant) % 10

                            comment_pool = [
                                user
                                for user in engaged_staff
                                if user.user_id != staff_user.user_id
                            ]
                            rotation_point = (staff_index + idea_variant + period_index) % max(1, len(comment_pool) or 1)
                            comment_pool = comment_pool[rotation_point:] + comment_pool[:rotation_point]
                            if coordinator:
                                comment_pool.append(coordinator)

                            if comment_pool and engagement_score not in {0, 1, 2}:
                                comment_target_count = min(len(comment_pool), 1 + (engagement_score % 4))
                                for comment_index, commenter in enumerate(comment_pool[:comment_target_count]):
                                    comment_text = build_unique_comment_text(
                                        idea_title=title,
                                        department_name=department.dept_name,
                                        commenter=commenter,
                                        academic_year=academic_year,
                                        period_index=period_index + idea_variant + staff_index,
                                        comment_index=comment_index,
                                    )
                                    comment, comment_created = Comment.objects.get_or_create(
                                        user=commenter,
                                        idea=idea,
                                        cmt_content=comment_text,
                                        defaults={
                                            "anonymous_status": (comment_index + staff_index + idea_variant) % 3 == 0,
                                        },
                                    )
                                    expected_anonymous = (comment_index + staff_index + idea_variant) % 3 == 0
                                    if not comment_created and comment.anonymous_status != expected_anonymous:
                                        comment.anonymous_status = expected_anonymous
                                        comment.save(update_fields=["anonymous_status"])

                                    comment_dt = submit_dt + timedelta(days=comment_index + 1, hours=comment_index + 1)
                                    set_created_datetime(comment, "cmt_datetime", comment_dt)

                                    if comment_created:
                                        created_comment_count += 1

                            voter_pool = [
                                user
                                for user in engaged_staff
                                if user.user_id != staff_user.user_id
                            ]
                            vote_rotation = (department_index + staff_index + idea_variant) % max(1, len(voter_pool) or 1)
                            voter_pool = voter_pool[vote_rotation:] + voter_pool[:vote_rotation]
                            if coordinator:
                                voter_pool.append(coordinator)

                            vote_target_count = min(len(voter_pool), 1 + ((engagement_score + 3) % 6))
                            for vote_index, voter in enumerate(voter_pool[:vote_target_count]):
                                vote_type = (
                                    Vote.VoteType.UPVOTE
                                    if (vote_index + engagement_score + period_index) % 5 != 0
                                    else Vote.VoteType.DOWNVOTE
                                )
                                vote, vote_created = Vote.objects.update_or_create(
                                    user=voter,
                                    idea=idea,
                                    defaults={"vote_type": vote_type},
                                )
                                vote_dt = submit_dt + timedelta(hours=vote_index + 1)
                                set_created_datetime(vote, "vote_datetime", vote_dt)

                                if vote_created:
                                    created_vote_count += 1

        total_period_count = ClosurePeriod.objects.count()
        total_idea_count = Idea.objects.count()
        total_comment_count = Comment.objects.count()
        total_vote_count = Vote.objects.count()
        active_period = ClosurePeriod.objects.filter(comment_closure_date__gt=today).order_by("start_date").first()

        self.stdout.write(self.style.SUCCESS("Seeded closure period activity data successfully."))
        self.stdout.write(f"Closure periods created this run: {created_period_count}")
        self.stdout.write(f"Ideas created this run: {created_idea_count}")
        self.stdout.write(f"Comments created this run: {created_comment_count}")
        self.stdout.write(f"Votes created this run: {created_vote_count}")
        self.stdout.write(f"Total closure periods: {total_period_count}")
        self.stdout.write(f"Total ideas: {total_idea_count}")
        self.stdout.write(f"Total comments: {total_comment_count}")
        self.stdout.write(f"Total votes: {total_vote_count}")
        if active_period:
            self.stdout.write(
                f"Current active period: {active_period.academic_year} "
                f"(idea deadline {active_period.idea_closure_date}, comment deadline {active_period.comment_closure_date})"
            )
