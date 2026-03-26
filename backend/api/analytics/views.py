from collections import defaultdict
from datetime import timedelta

from django.contrib.auth import get_user_model
from django.db.models import Count, Q
from django.utils import timezone
from rest_framework import permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from api.IdeaPost.models import Idea
from api.models import Department
from api.interaction.models import Vote
from .models import ActivityLog

User = get_user_model()


def _normalized_role(user) -> str:
    role_name = getattr(getattr(user, "role", None), "role_name", "") or ""
    return role_name.strip().lower().replace(" ", "_")


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
