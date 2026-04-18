from django.contrib.auth import get_user_model
from rest_framework import permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Announcement
from .serializer import AnnouncementSerializer

User = get_user_model()


def _normalized_role(user) -> str:
    role_name = getattr(getattr(user, "role", None), "role_name", "") or ""
    return role_name.strip().lower().replace(" ", "_")


def _coerce_bool(value, default=True):
    if value is None:
        return default
    if isinstance(value, bool):
        return value
    return str(value).strip().lower() not in {"false", "0", "no", "off", ""}


def _announcements_queryset_for_user(user):
    role = _normalized_role(user)
    queryset = Announcement.objects.select_related("posted_by", "posted_by__department", "posted_by__role")

    if role in {"qa_manager", "admin"}:
        return queryset

    department = getattr(user, "department", None)
    if not department:
        return queryset.none()

    filtered = queryset.filter(posted_by__department=department)
    if role in {"staff", "qa_coordinator"}:
        filtered = filtered.filter(is_active=True)
    return filtered


class AnnouncementListCreateView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        queryset = _announcements_queryset_for_user(request.user)
        serializer = AnnouncementSerializer(queryset, many=True)
        return Response({"results": serializer.data}, status=status.HTTP_200_OK)

    def post(self, request):
        if _normalized_role(request.user) != "qa_coordinator":
            return Response({"message": "Only QA Coordinators can create announcements."}, status=status.HTTP_403_FORBIDDEN)

        if not getattr(request.user, "department", None):
            return Response({"message": "Coordinator must belong to a department."}, status=status.HTTP_400_BAD_REQUEST)

        serializer = AnnouncementSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        announcement = Announcement.objects.create(
            posted_by=request.user,
            a_title=serializer.validated_data["a_title"],
            a_content=serializer.validated_data["a_content"],
            is_active=_coerce_bool(request.data.get("is_active"), default=True),
        )
        return Response(AnnouncementSerializer(announcement).data, status=status.HTTP_201_CREATED)


class AnnouncementDetailView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get_object(self, request, a_id):
        queryset = _announcements_queryset_for_user(request.user)
        return queryset.filter(a_id=a_id).first()

    def patch(self, request, a_id):
        announcement = self.get_object(request, a_id)
        if not announcement:
            return Response({"message": "Announcement not found."}, status=status.HTTP_404_NOT_FOUND)

        role = _normalized_role(request.user)
        if role == "qa_coordinator":
            if announcement.posted_by_id != request.user.user_id:
                return Response({"message": "You can only edit your own announcements."}, status=status.HTTP_403_FORBIDDEN)

            partial_serializer = AnnouncementSerializer(announcement, data=request.data, partial=True)
            partial_serializer.is_valid(raise_exception=True)

            for field in ("a_title", "a_content", "is_active"):
                if field in partial_serializer.validated_data:
                    setattr(announcement, field, partial_serializer.validated_data[field])
            announcement.save()
            return Response(AnnouncementSerializer(announcement).data, status=status.HTTP_200_OK)

        if role == "qa_manager":
            if "is_active" not in request.data:
                return Response({"message": "QA Manager can only hide or show announcements."}, status=status.HTTP_400_BAD_REQUEST)
            announcement.is_active = _coerce_bool(request.data.get("is_active"), default=announcement.is_active)
            announcement.save(update_fields=["is_active", "updated_at"])
            return Response(AnnouncementSerializer(announcement).data, status=status.HTTP_200_OK)

        return Response({"message": "Not authorized."}, status=status.HTTP_403_FORBIDDEN)

    def delete(self, request, a_id):
        announcement = self.get_object(request, a_id)
        if not announcement:
            return Response({"message": "Announcement not found."}, status=status.HTTP_404_NOT_FOUND)

        role = _normalized_role(request.user)
        if role == "qa_coordinator" and announcement.posted_by_id == request.user.user_id:
            announcement.is_active = False
            announcement.save(update_fields=["is_active", "updated_at"])
            return Response({"message": "Announcement hidden."}, status=status.HTTP_200_OK)

        if role == "qa_manager":
            announcement.is_active = False
            announcement.save(update_fields=["is_active", "updated_at"])
            return Response({"message": "Announcement hidden."}, status=status.HTTP_200_OK)

        return Response({"message": "Not authorized."}, status=status.HTTP_403_FORBIDDEN)


class AnnouncementHighlightsView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        queryset = _announcements_queryset_for_user(request.user).filter(is_active=True)[:5]
        serializer = AnnouncementSerializer(queryset, many=True)
        return Response({"results": serializer.data}, status=status.HTTP_200_OK)
