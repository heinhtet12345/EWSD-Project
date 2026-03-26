from collections import Counter, defaultdict
from datetime import timedelta

from django.contrib.auth import get_user_model
from django.db.models import Count, Q
from django.utils import timezone
from rest_framework import permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from api.IdeaPost.models import Idea
from api.models import Department
from api.interaction.models import Comment, Report, Vote
from api.closure_period.models import ClosurePeriod
from .models import ActivityLog

User = get_user_model()


def _normalized_role(user) -> str:
    role_name = getattr(getattr(user, "role", None), "role_name", "") or ""
    return role_name.strip().lower().replace(" ", "_")


def _display_name(user) -> str:
    if not user:
        return "Unknown"
    first_name = str(getattr(user, "first_name", "") or "").strip()
    last_name = str(getattr(user, "last_name", "") or "").strip()
    full_name = f"{first_name} {last_name}".strip()
    return full_name or str(getattr(user, "username", "Unknown"))


def _extract_browser(user_agent: str) -> str:
    ua = (user_agent or "").lower()
    if "edg/" in ua:
        return "Edge"
    if "chrome/" in ua and "edg/" not in ua:
        return "Chrome"
    if "firefox/" in ua:
        return "Firefox"
    if "safari/" in ua and "chrome/" not in ua:
        return "Safari"
    if "opr/" in ua or "opera" in ua:
        return "Opera"
    return "Other"


def _extract_os(user_agent: str) -> str:
    ua = (user_agent or "").lower()
    if "windows" in ua:
        return "Windows"
    if "mac os" in ua or "macintosh" in ua:
        return "macOS"
    if "android" in ua:
        return "Android"
    if "iphone" in ua or "ipad" in ua or "ios" in ua:
        return "iOS"
    if "linux" in ua:
        return "Linux"
    return "Other"


def _extract_device_type(user_agent: str) -> str:
    ua = (user_agent or "").lower()
    if "mobile" in ua or "android" in ua or "iphone" in ua:
        return "Mobile"
    if "ipad" in ua or "tablet" in ua:
        return "Tablet"
    return "Desktop"


def _serialize_idea_card(idea):
    return {
        "idea_id": idea.idea_id,
        "idea_title": idea.idea_title,
        "department_name": getattr(idea.department, "dept_name", ""),
        "submit_datetime": idea.submit_datetime,
        "comment_count": idea.comments.count(),
        "upvote_count": idea.votes.filter(vote_type=Vote.VoteType.UPVOTE).count(),
        "anonymous_status": idea.anonymous_status,
        "author_name": _display_name(getattr(idea, "user", None)),
    }


def _serialize_report_row(report):
    target_idea = report.idea or getattr(report.comment, "idea", None)
    return {
        "report_id": report.report_id,
        "status": report.status,
        "target_type": report.target_type,
        "reason": report.reason,
        "created_at": report.created_at,
        "idea_id": getattr(target_idea, "idea_id", None),
        "idea_title": getattr(target_idea, "idea_title", "") if target_idea else "",
    }


def _active_closure(today):
    return (
        ClosurePeriod.objects.filter(start_date__lte=today, comment_closure_date__gt=today)
        .order_by("comment_closure_date")
        .first()
    )


class TrackActivityView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        path = str(request.data.get("path", "")).strip() or request.path
        event_type = str(request.data.get("event_type", "page_view")).strip() or "page_view"
        metadata = request.data.get("metadata", {})
        if not isinstance(metadata, dict):
            metadata = {}

        # Do not store admin page-view events.
        if event_type == "page_view" and _normalized_role(request.user) == "admin":
            return Response({"message": "Admin page view ignored."}, status=status.HTTP_200_OK)

        user_agent = request.META.get("HTTP_USER_AGENT", "")
        browser = _extract_browser(user_agent)
        operating_system = _extract_os(user_agent)
        device_type = _extract_device_type(user_agent)

        ActivityLog.objects.create(
            user=request.user,
            event_type=event_type,
            path=path[:255],
            browser=browser,
            operating_system=operating_system,
            device_type=device_type,
            metadata=metadata,
        )

        return Response({"message": "Activity logged."}, status=status.HTTP_201_CREATED)


class AdminAnalyticsSummaryView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        if _normalized_role(request.user) != "admin":
            return Response({"message": "Not authorized."}, status=status.HTTP_403_FORBIDDEN)

        try:
            days = int(request.query_params.get("days", 30))
        except (TypeError, ValueError):
            days = 30
        days = max(1, min(days, 365))

        since = timezone.now() - timedelta(days=days)
        logs = ActivityLog.objects.filter(created_at__gte=since).exclude(
            event_type="page_view",
            user__role__role_name__iexact="admin",
        )

        top_pages = list(
            logs.values("path")
            .annotate(view_count=Count("activity_log_id"))
            .order_by("-view_count", "path")[:10]
        )

        top_users = list(
            logs.filter(user__isnull=False)
            .values("user__username")
            .annotate(activity_count=Count("activity_log_id"))
            .order_by("-activity_count", "user__username")[:10]
        )

        browsers = list(
            logs.values("browser")
            .annotate(usage_count=Count("activity_log_id"))
            .order_by("-usage_count", "browser")
        )

        return Response(
            {
                "period_days": days,
                "total_events": logs.count(),
                "top_pages": top_pages,
                "top_users": top_users,
                "browsers": browsers,
            },
            status=status.HTTP_200_OK,
        )


class AdminActivityLogsView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        if _normalized_role(request.user) != "admin":
            return Response({"message": "Not authorized."}, status=status.HTTP_403_FORBIDDEN)

        try:
            days = int(request.query_params.get("days", 30))
        except (TypeError, ValueError):
            days = 30
        days = max(1, min(days, 365))

        try:
            page = int(request.query_params.get("page", 1))
        except (TypeError, ValueError):
            page = 1
        page = max(1, page)

        try:
            page_size = int(request.query_params.get("page_size", 10))
        except (TypeError, ValueError):
            page_size = 10
        page_size = max(5, min(page_size, 100))

        event_type = str(request.query_params.get("event_type", "")).strip().lower()
        search = str(request.query_params.get("search", "")).strip().lower()

        since = timezone.now() - timedelta(days=days)
        queryset = ActivityLog.objects.select_related("user").filter(created_at__gte=since).exclude(
            event_type="page_view",
            user__role__role_name__iexact="admin",
        )

        if event_type:
            queryset = queryset.filter(event_type=event_type)

        if search:
            filtered_ids = []
            for log in queryset:
                username = (log.user.username if log.user else "").lower()
                if (
                    search in username
                    or search in (log.path or "").lower()
                    or search in (log.browser or "").lower()
                    or search in (log.operating_system or "").lower()
                    or search in (log.device_type or "").lower()
                    or search in (log.event_type or "").lower()
                ):
                    filtered_ids.append(log.activity_log_id)
            queryset = queryset.filter(activity_log_id__in=filtered_ids)

        total_count = queryset.count()
        start = (page - 1) * page_size
        end = start + page_size

        logs = queryset.order_by("-created_at")[start:end]

        results = [
            {
                "activity_log_id": log.activity_log_id,
                "username": log.user.username if log.user else "Unknown",
                "event_type": log.event_type,
                "path": log.path,
                "browser": log.browser,
                "operating_system": log.operating_system,
                "device_type": log.device_type,
                "created_at": log.created_at,
                "metadata": log.metadata,
            }
            for log in logs
        ]

        return Response(
            {
                "results": results,
                "count": total_count,
                "page": page,
                "page_size": page_size,
                "period_days": days,
            },
            status=status.HTTP_200_OK,
        )


class AdminSystemDashboardView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        if _normalized_role(request.user) != "admin":
            return Response({"message": "Not authorized."}, status=status.HTTP_403_FORBIDDEN)

        try:
            days = int(request.query_params.get("days", 30))
        except (TypeError, ValueError):
            days = 30
        days = max(7, min(days, 365))

        now = timezone.now()
        since = now - timedelta(days=days)
        logs_queryset = ActivityLog.objects.select_related("user").filter(created_at__gte=since).order_by("-created_at")
        logs = list(logs_queryset)

        top_pages = list(
            logs_queryset.values("path")
            .annotate(view_count=Count("activity_log_id"))
            .order_by("-view_count", "path")[:8]
        )

        top_users_queryset = (
            logs_queryset.filter(user__isnull=False)
            .values("user_id")
            .annotate(activity_count=Count("activity_log_id"))
            .order_by("-activity_count", "user_id")[:8]
        )
        top_users = []
        for item in top_users_queryset:
            user = User.objects.filter(user_id=item["user_id"]).first()
            top_users.append(
                {
                    "user_id": item["user_id"],
                    "display_name": _display_name(user),
                    "username": getattr(user, "username", "Unknown") if user else "Unknown",
                    "activity_count": item["activity_count"],
                }
            )

        event_breakdown = list(
            logs_queryset.values("event_type")
            .annotate(event_count=Count("activity_log_id"))
            .order_by("-event_count", "event_type")
        )

        browser_breakdown = list(
            logs_queryset.values("browser")
            .annotate(usage_count=Count("activity_log_id"))
            .order_by("-usage_count", "browser")
        )

        device_breakdown = list(
            logs_queryset.values("device_type")
            .annotate(usage_count=Count("activity_log_id"))
            .order_by("-usage_count", "device_type")
        )

        os_breakdown = list(
            logs_queryset.values("operating_system")
            .annotate(usage_count=Count("activity_log_id"))
            .order_by("-usage_count", "operating_system")
        )

        last_24h = now - timedelta(hours=24)
        previous_24h_start = now - timedelta(hours=48)
        recent_24h_logs = [log for log in logs if log.created_at >= last_24h]
        previous_24h_logs = [log for log in logs if previous_24h_start <= log.created_at < last_24h]
        recent_1h_logs = [log for log in logs if log.created_at >= now - timedelta(hours=1)]

        previous_count = len(previous_24h_logs)
        recent_count = len(recent_24h_logs)
        traffic_change_percent = round(
            ((recent_count - previous_count) / previous_count * 100) if previous_count else (100 if recent_count else 0),
            2,
        )

        if recent_count >= 150 or traffic_change_percent >= 35:
            traffic_status = "High"
        elif recent_count <= 25 and traffic_change_percent < -20:
            traffic_status = "Low"
        else:
            traffic_status = "Normal"

        hour_counter = Counter(log.created_at.hour for log in logs)
        peak_hours = [
            {"hour": f"{hour:02d}:00", "event_count": count}
            for hour, count in hour_counter.most_common(6)
        ]

        recent_activity = [
            {
                "activity_log_id": log.activity_log_id,
                "username": log.user.username if log.user else "Unknown",
                "event_type": log.event_type,
                "path": log.path,
                "browser": log.browser,
                "operating_system": log.operating_system,
                "device_type": log.device_type,
                "created_at": log.created_at,
            }
            for log in logs[:5]
        ]

        unique_active_users = len({log.user_id for log in logs if log.user_id})
        top_user = top_users[0] if top_users else None
        top_page = top_pages[0] if top_pages else None

        return Response(
            {
                "period_days": days,
                "summary": {
                    "total_events": len(logs),
                    "unique_active_users": unique_active_users,
                    "total_user_accounts": User.objects.count(),
                    "total_departments": Department.objects.count(),
                    "total_ideas": Idea.objects.count(),
                    "page_view_count": sum(1 for log in logs if log.event_type == "page_view"),
                    "login_count": sum(1 for log in logs if log.event_type == "login"),
                    "average_daily_events": round(len(logs) / days, 2) if days else 0,
                    "most_viewed_page": top_page["path"] if top_page else None,
                    "most_viewed_page_count": top_page["view_count"] if top_page else 0,
                    "most_active_user": top_user["display_name"] if top_user else None,
                    "most_active_user_count": top_user["activity_count"] if top_user else 0,
                },
                "traffic": {
                    "status": traffic_status,
                    "recent_1h_events": len(recent_1h_logs),
                    "recent_24h_events": recent_count,
                    "previous_24h_events": previous_count,
                    "change_percent": traffic_change_percent,
                },
                "charts": {
                    "top_pages": [
                        {"path": item["path"], "view_count": item["view_count"]}
                        for item in top_pages
                    ],
                    "top_users": [
                        {
                            "display_name": item["display_name"],
                            "username": item["username"],
                            "activity_count": item["activity_count"],
                        }
                        for item in top_users
                    ],
                    "event_breakdown": [
                        {"event_type": item["event_type"], "event_count": item["event_count"]}
                        for item in event_breakdown
                    ],
                    "device_breakdown": [
                        {"device_type": item["device_type"] or "Unknown", "usage_count": item["usage_count"]}
                        for item in device_breakdown
                    ],
                    "peak_hours": peak_hours,
                },
                "tables": {
                    "top_pages": [
                        {"path": item["path"], "view_count": item["view_count"]}
                        for item in top_pages
                    ],
                    "top_users": [
                        {
                            "display_name": item["display_name"],
                            "username": item["username"],
                            "activity_count": item["activity_count"],
                        }
                        for item in top_users
                    ],
                    "browsers": [
                        {"browser": item["browser"] or "Unknown", "usage_count": item["usage_count"]}
                        for item in browser_breakdown[:6]
                    ],
                    "operating_systems": [
                        {"operating_system": item["operating_system"] or "Unknown", "usage_count": item["usage_count"]}
                        for item in os_breakdown[:6]
                    ],
                    "recent_activity": recent_activity,
                },
            },
            status=status.HTTP_200_OK,
        )


class StaffDashboardView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        if _normalized_role(request.user) != "staff":
            return Response({"message": "Not authorized."}, status=status.HTTP_403_FORBIDDEN)

        today = timezone.now().date()
        user = request.user
        active_closure = _active_closure(today)

        user_ideas_qs = (
            Idea.objects.filter(user=user)
            .select_related("department", "closurePeriod", "user")
            .prefetch_related("comments", "votes")
            .order_by("-submit_datetime")
        )
        department_ideas_qs = (
            Idea.objects.filter(department=user.department)
            .select_related("department", "closurePeriod", "user")
            .prefetch_related("comments", "votes")
            .order_by("-submit_datetime")
        )

        user_ideas = list(user_ideas_qs)
        department_ideas = list(department_ideas_qs)
        active_department_ideas = [
            idea for idea in department_ideas if active_closure and idea.closurePeriod_id == active_closure.id
        ]

        comment_count = Comment.objects.filter(user=user).count()
        vote_count = Vote.objects.filter(user=user).count()
        department_contributors = len({idea.user_id for idea in department_ideas})

        closure_counter = Counter(
            getattr(idea.closurePeriod, "academic_year", "Unknown")
            for idea in user_ideas
        )
        idea_history = [
            {"label": label, "idea_count": count}
            for label, count in list(closure_counter.items())[-6:]
        ]

        engagement_mix = {
            "ideas": len(user_ideas),
            "comments": comment_count,
            "votes": vote_count,
        }

        popular_department_ideas = sorted(
            active_department_ideas or department_ideas,
            key=lambda idea: (
                idea.votes.filter(vote_type=Vote.VoteType.UPVOTE).count(),
                idea.comments.count(),
                idea.submit_datetime,
            ),
            reverse=True,
        )[:5]

        return Response(
            {
                "summary": {
                    "my_idea_count": len(user_ideas),
                    "my_comment_count": comment_count,
                    "my_vote_count": vote_count,
                    "department_idea_count": len(department_ideas),
                    "department_contributor_count": department_contributors,
                },
                "profile": {
                    "display_name": _display_name(user),
                    "department_name": getattr(user.department, "dept_name", "No Department"),
                },
                "active_closure": {
                    "academic_year": getattr(active_closure, "academic_year", None),
                    "idea_closure_date": getattr(active_closure, "idea_closure_date", None),
                    "comment_closure_date": getattr(active_closure, "comment_closure_date", None),
                    "is_idea_open": getattr(active_closure, "is_idea_open", False) if active_closure else False,
                    "is_comment_open": getattr(active_closure, "is_comment_open", False) if active_closure else False,
                },
                "charts": {
                    "idea_history": idea_history,
                    "engagement_mix": engagement_mix,
                },
                "lists": {
                    "recent_my_ideas": [_serialize_idea_card(idea) for idea in user_ideas[:5]],
                    "popular_department_ideas": [_serialize_idea_card(idea) for idea in popular_department_ideas],
                    "ideas_needing_comments": [
                        _serialize_idea_card(idea)
                        for idea in (active_department_ideas or department_ideas)
                        if idea.comments.count() == 0
                    ][:5],
                },
            },
            status=status.HTTP_200_OK,
        )


class QACoordinatorDashboardView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        if _normalized_role(request.user) != "qa_coordinator":
            return Response({"message": "Not authorized."}, status=status.HTTP_403_FORBIDDEN)

        today = timezone.now().date()
        user = request.user
        department = user.department
        active_closure = _active_closure(today)

        department_ideas_qs = (
            Idea.objects.filter(department=department)
            .select_related("department", "closurePeriod", "user")
            .prefetch_related("comments", "votes")
            .order_by("-submit_datetime")
        )
        department_ideas = list(department_ideas_qs)
        active_department_ideas = [
            idea for idea in department_ideas if active_closure and idea.closurePeriod_id == active_closure.id
        ]

        staff_queryset = User.objects.filter(
            department=department,
            role__role_name__iexact="staff",
        )
        staff_ids = list(staff_queryset.values_list("user_id", flat=True))

        department_comment_count = Comment.objects.filter(idea__department=department).count()
        department_vote_count = Vote.objects.filter(idea__department=department).count()
        in_review_reports = Report.objects.filter(
            Q(idea__department=department) | Q(comment__idea__department=department),
            status=Report.Status.IN_REVIEW,
        ).distinct()
        all_reports = Report.objects.filter(
            Q(idea__department=department) | Q(comment__idea__department=department)
        ).distinct().order_by("-created_at")

        contributor_rows = []
        for staff in staff_queryset:
            idea_total = sum(1 for idea in department_ideas if idea.user_id == staff.user_id)
            comment_total = Comment.objects.filter(user=staff, idea__department=department).count()
            vote_total = Vote.objects.filter(user=staff, idea__department=department).count()
            contributor_rows.append(
                {
                    "display_name": _display_name(staff),
                    "idea_count": idea_total,
                    "activity_count": idea_total + comment_total + vote_total,
                }
            )
        contributor_rows.sort(key=lambda item: (item["activity_count"], item["idea_count"], item["display_name"]), reverse=True)

        closure_counter = Counter(
            getattr(idea.closurePeriod, "academic_year", "Unknown")
            for idea in department_ideas
        )
        ideas_by_period = [
            {"label": label, "idea_count": count}
            for label, count in list(closure_counter.items())[-6:]
        ]

        moderation_status = [
            {"label": status_label, "count": count}
            for status_label, count in Counter(report.status for report in all_reports).items()
        ]

        popular_department_ideas = sorted(
            active_department_ideas or department_ideas,
            key=lambda idea: (
                idea.votes.filter(vote_type=Vote.VoteType.UPVOTE).count(),
                idea.comments.count(),
                idea.submit_datetime,
            ),
            reverse=True,
        )[:5]

        participating_staff_count = len({idea.user_id for idea in department_ideas if idea.user_id in staff_ids})

        return Response(
            {
                "summary": {
                    "staff_count": len(staff_ids),
                    "participating_staff_count": participating_staff_count,
                    "department_idea_count": len(department_ideas),
                    "active_idea_count": len(active_department_ideas),
                    "in_review_report_count": in_review_reports.count(),
                },
                "profile": {
                    "display_name": _display_name(user),
                    "department_name": getattr(department, "dept_name", "No Department"),
                },
                "active_closure": {
                    "academic_year": getattr(active_closure, "academic_year", None),
                    "idea_closure_date": getattr(active_closure, "idea_closure_date", None),
                    "comment_closure_date": getattr(active_closure, "comment_closure_date", None),
                },
                "charts": {
                    "ideas_by_period": ideas_by_period,
                    "top_contributors": contributor_rows[:6],
                    "engagement_mix": {
                        "ideas": len(department_ideas),
                        "comments": department_comment_count,
                        "votes": department_vote_count,
                    },
                    "moderation_status": moderation_status,
                },
                "lists": {
                    "latest_department_ideas": [_serialize_idea_card(idea) for idea in department_ideas[:5]],
                    "popular_department_ideas": [_serialize_idea_card(idea) for idea in popular_department_ideas],
                    "ideas_without_comments": [
                        _serialize_idea_card(idea) for idea in department_ideas if idea.comments.count() == 0
                    ][:5],
                    "reported_items": [_serialize_report_row(report) for report in all_reports[:5]],
                },
            },
            status=status.HTTP_200_OK,
        )


class QAManagerDashboardView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        if _normalized_role(request.user) != "qa_manager":
            return Response({"message": "Not authorized."}, status=status.HTTP_403_FORBIDDEN)

        department_id = request.query_params.get("department_id")
        scope = str(request.query_params.get("scope", "all")).strip().lower()
        if scope not in {"all", "active"}:
            scope = "all"

        today = timezone.now().date()
        ideas = (
            Idea.objects.select_related("department", "closurePeriod", "user")
            .prefetch_related("comments", "votes")
            .order_by("-submit_datetime")
        )

        if department_id and str(department_id).isdigit():
            ideas = ideas.filter(department_id=department_id)

        if scope == "active":
            ideas = ideas.filter(
                closurePeriod__start_date__lte=today,
                closurePeriod__comment_closure_date__gt=today,
            )

        idea_list = list(ideas)
        departments = list(Department.objects.order_by("dept_name"))

        ideas_by_department = defaultdict(int)
        contributors_by_department = defaultdict(set)
        for idea in idea_list:
            dept_name = getattr(idea.department, "dept_name", "Unknown")
            ideas_by_department[dept_name] += 1
            contributors_by_department[dept_name].add(idea.user_id)

        department_chart = [
            {
                "department_name": dept.dept_name,
                "idea_count": ideas_by_department.get(dept.dept_name, 0),
                "idea_percentage": 0,
                "contributor_count": len(contributors_by_department.get(dept.dept_name, set())),
            }
            for dept in departments
        ]

        total_filtered_ideas = len(idea_list)
        for item in department_chart:
            item["idea_percentage"] = round(
                (item["idea_count"] / total_filtered_ideas * 100) if total_filtered_ideas else 0,
                2,
            )

        latest_ideas = [
            {
                "idea_id": idea.idea_id,
                "idea_title": idea.idea_title,
                "department_name": getattr(idea.department, "dept_name", ""),
                "submit_datetime": idea.submit_datetime,
                "comment_count": idea.comments.count(),
                "upvote_count": idea.votes.filter(vote_type=Vote.VoteType.UPVOTE).count(),
            }
            for idea in idea_list[:5]
        ]

        popular_ideas = sorted(
            idea_list,
            key=lambda idea: (
                idea.votes.filter(vote_type=Vote.VoteType.UPVOTE).count(),
                idea.comments.count(),
                idea.submit_datetime,
            ),
            reverse=True,
        )[:5]
        popular_idea_results = [
            {
                "idea_id": idea.idea_id,
                "idea_title": idea.idea_title,
                "department_name": getattr(idea.department, "dept_name", ""),
                "submit_datetime": idea.submit_datetime,
                "comment_count": idea.comments.count(),
                "upvote_count": idea.votes.filter(vote_type=Vote.VoteType.UPVOTE).count(),
            }
            for idea in popular_ideas
        ]

        ideas_without_comments = [
            {
                "idea_id": idea.idea_id,
                "idea_title": idea.idea_title,
                "department_name": getattr(idea.department, "dept_name", ""),
                "submit_datetime": idea.submit_datetime,
            }
            for idea in idea_list
            if idea.comments.count() == 0
        ][:5]

        anonymous_ideas = [
            {
                "idea_id": idea.idea_id,
                "idea_title": idea.idea_title,
                "department_name": getattr(idea.department, "dept_name", ""),
                "submit_datetime": idea.submit_datetime,
            }
            for idea in idea_list
            if idea.anonymous_status
        ][:5]

        total_user_accounts = User.objects.count()
        department_count = Department.objects.count()

        return Response(
            {
                "summary": {
                    "total_user_accounts": total_user_accounts,
                    "total_idea_count": total_filtered_ideas,
                    "department_count": department_count,
                },
                "filters": {
                    "department_options": [
                        {"department_id": dept.dept_id, "department_name": dept.dept_name}
                        for dept in departments
                    ],
                    "selected_department_id": int(department_id) if str(department_id).isdigit() else None,
                    "scope": scope,
                },
                "charts": {
                    "ideas_by_department": department_chart,
                    "contributors_by_department": [
                        {
                            "department_name": item["department_name"],
                            "contributor_count": item["contributor_count"],
                        }
                        for item in department_chart
                    ],
                },
                "ideas": {
                    "latest": latest_ideas,
                    "popular": popular_idea_results,
                },
                "exception_reports": {
                    "without_comments": ideas_without_comments,
                    "anonymous": anonymous_ideas,
                },
            },
            status=status.HTTP_200_OK,
        )
