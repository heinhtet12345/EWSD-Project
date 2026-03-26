from datetime import timedelta

from django.db.models import Count
from django.utils import timezone
from rest_framework import permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import ActivityLog
from django.contrib.auth import get_user_model
from .models import Idea
from django.db.models import Max
from django.db.models import Count, Q, F, IntegerField, ExpressionWrapper



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


User = get_user_model()
class ActiveUserCountAPIView(APIView):
    def get(self, request):
        count = User.objects.filter(is_active=True).count()
        return Response({
            "active_user_count": count
        })
    
class IdeaCountAPIView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        count = Idea.objects.count()
        return Response({
            "total_idea_count": count
        })
class IdeaCountByDepartmentAPIView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        data = (
            Idea.objects
            .values('department__dept_name')
            .annotate(idea_count=Count('idea_id'))
            .order_by('department__dept_name')
        )

        result = [
            {
                "department": item['department__dept_name'],
                "idea_count": item['idea_count']
            }
            for item in data
        ]

        return Response(result)

class IdeaPercentageByDepartmentAPIView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        total_ideas = Idea.objects.count()

        data = (
            Idea.objects
            .values('department__dept_name')
            .annotate(idea_count=Count('idea_id'))
            .order_by('department__dept_name')
        )

        result = []
        for item in data:
            percentage = 0
            if total_ideas > 0:
                percentage = round((item['idea_count'] / total_ideas) * 100, 2)

            result.append({
                "department": item['department__dept_name'],
                "idea_count": item['idea_count'],
                "percentage": percentage
            })

        return Response(result)

class ContributorsByDepartmentAPIView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        data = (
            Idea.objects
            .values('department__dept_name')
            .annotate(contributor_count=Count('user', distinct=True))
            .order_by('department__dept_name')
        )

        result = [
            {
                "department": item['department__dept_name'],
                "contributor_count": item['contributor_count']
            }
            for item in data
        ]

        return Response(result)

class LatestIdeaByDepartmentAPIView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        # Get department from query parameter
        department_name = request.query_params.get('department', None)
        if not department_name:
            return Response({"message": "Department parameter is required."}, status=400)

        # Get the latest idea for the selected department
        latest_idea = (
            Idea.objects.filter(department__dept_name=department_name)
            .order_by('-submit_datetime')
            .first()
        )

        if not latest_idea:
            return Response({"message": f"No ideas found for department '{department_name}'."})

        result = {
            "department_name": department_name,
            "idea_id": latest_idea.idea_id,
            "idea_title": latest_idea.idea_title,
            "submit_datetime": latest_idea.submit_datetime
        }

        return Response(result)

class PopularIdeaByDepartmentAPIView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        # Get department name from query param
        dept_name = request.query_params.get('department', None)

        if not dept_name:
            return Response({"message": "Department parameter is required."}, status=400)

        # Filter ideas by selected department
        idea = (
            Idea.objects.filter(department__dept_name=dept_name)
            .annotate(
                upvote_count=Count('votes', filter=Q(votes__vote_type='UP')),
                downvote_count=Count('votes', filter=Q(votes__vote_type='DOWN')),
                net_votes=F('upvote_count') - F('downvote_count')
            )
            .order_by('-net_votes', '-submit_datetime')  # most votes first, latest if tie
            .first()
        )

        if not idea:
            return Response({"message": f"No ideas found for department {dept_name}."})

        result = {
            "department": dept_name,
            "idea_id": idea.idea_id,
            "idea_title": idea.idea_title,
            "submit_datetime": idea.submit_datetime
        }

        return Response(result)
    
class IdeasWithoutCommentsAPIView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        # Annotate comment count per idea
        ideas = (
            Idea.objects.annotate(comment_count=Count('comments'))
            .filter(comment_count=0)
            .order_by('-submit_datetime')
        )

        result = [
            {
                "idea_id": idea.idea_id,
                "idea_title": idea.idea_title,
                "submit_datetime": idea.submit_datetime,
                "department": idea.department.dept_name if idea.department else None,
                "user": idea.user.username if idea.user else None,
            }
            for idea in ideas
        ]

        return Response(result)
class AnonymousIdeasWithCommentsAPIView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        # Get all anonymous ideas
        ideas = (
            Idea.objects.filter(anonymous_status=True)
            .prefetch_related('comments')  # fetch related comments
            .order_by('-submit_datetime')
        )

        result = []
        for idea in ideas:
            result.append({
                "idea_id": idea.idea_id,
                "idea_title": idea.idea_title,
                "submit_datetime": idea.submit_datetime,
                "department": idea.department.dept_name if idea.department else None,
                "comments": [
                    {
                        "comment_id": c.comment_id,
                        "comment_text": c.comment_text,
                        "user": c.user.username if c.user else None,
                        "submit_datetime": c.submit_datetime
                    }
                    for c in idea.comments.all()
                ]
            })

        return Response(result)