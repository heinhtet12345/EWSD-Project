import threading

from django.contrib.auth import get_user_model
from django.core.mail import BadHeaderError, EmailMultiAlternatives
from django.db import transaction
from rest_framework import permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from api.models import Notification
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


def _build_announcement_email(*, title, intro, details, closing_note):
    message = (
        "Dear User,\n\n"
        f"{intro}\n\n"
        + (
            "Details:\n\n" + "\n".join(f"{label}: {value}" for label, value in details) + "\n\n"
            if details
            else ""
        )
        + f"{closing_note}\n\n"
        "Best regards,\n"
        "RBAC Contribution Platform\n"
        "Group 5 University\n"
        "system@ewsd.edu"
    )
    details_rows = "".join(
        f"""
            <tr>
                <td style="padding:6px 0;font-weight:700;color:#475569;width:180px;">{label}:</td>
                <td style="padding:6px 0;color:#0f172a;">{value}</td>
            </tr>
        """
        for label, value in details
    )
    html_message = f"""
        <div style="background:#f8fafc;padding:32px 16px;font-family:Arial,sans-serif;color:#0f172a;">
            <div style="max-width:640px;margin:0 auto;background:#ffffff;border:1px solid #e2e8f0;border-radius:16px;overflow:hidden;">
                <div style="background:#0f766e;padding:24px 28px;color:#ffffff;">
                    <p style="margin:0;font-size:12px;letter-spacing:.08em;text-transform:uppercase;opacity:.9;">RBAC Contribution Platform</p>
                    <h1 style="margin:8px 0 0;font-size:22px;line-height:1.3;">{title}</h1>
                </div>
                <div style="padding:28px;">
                    <p style="margin:0 0 16px;font-size:15px;line-height:1.7;">Dear User,</p>
                    <p style="margin:0 0 20px;font-size:15px;line-height:1.7;">{intro}</p>
                    {"<div style='margin:0 0 24px;padding:20px;border:1px solid #cbd5e1;border-radius:12px;background:#f8fafc;'><p style='margin:0 0 12px;font-size:14px;font-weight:700;color:#334155;'>Details</p><table style='width:100%;border-collapse:collapse;font-size:14px;line-height:1.6;'>" + details_rows + "</table></div>" if details else ""}
                    <p style="margin:0;font-size:15px;line-height:1.7;">{closing_note}</p>
                </div>
                <div style="padding:20px 28px;background:#f1f5f9;border-top:1px solid #e2e8f0;font-size:13px;line-height:1.7;color:#475569;">
                    <p style="margin:0;font-weight:700;color:#0f172a;">Best regards,</p>
                    <p style="margin:4px 0 0;">RBAC Contribution Platform</p>
                    <p style="margin:0;">Group 5 University</p>
                    <p style="margin:0;">system@ewsd.edu</p>
                </div>
            </div>
        </div>
    """
    return message, html_message


def _announcement_notification_recipients():
    return [
        user
        for user in User.objects.select_related("role", "department")
        if _normalized_role(user) != "admin" and bool(getattr(user, "active_status", True))
    ]


def _notify_new_announcement(*, announcement):
    title = "New announcement posted"
    department_name = getattr(getattr(announcement.posted_by, "department", None), "dept_name", "") or "Unknown Department"
    message = (
        f'A new announcement "{announcement.a_title}" was posted by the QA Coordinator for {department_name}.'
    )
    email_details = [
        ("Announcement Title", announcement.a_title),
        ("Department", department_name),
        ("Posted By", getattr(announcement.posted_by, "username", "QA Coordinator")),
        ("Status", "Active" if announcement.is_active else "Hidden"),
    ]
    closing_note = "Please log in to the platform to read the full announcement."

    recipients = _announcement_notification_recipients()
    email_addresses: list[str] = []
    seen_addresses: set[str] = set()

    message_text, html_message = _build_announcement_email(
        title=title,
        intro=message,
        details=email_details,
        closing_note=closing_note,
    )

    for recipient in recipients:
        Notification.objects.get_or_create(
            recipient=recipient,
            message=message,
            notification_type="announcement_created",
            defaults={
                "title": title,
            },
        )

        if recipient.email:
            normalized_email = str(recipient.email).strip().lower()
            if normalized_email and normalized_email not in seen_addresses:
                seen_addresses.add(normalized_email)
                email_addresses.append(recipient.email)

    if email_addresses:
        try:
            email_message = EmailMultiAlternatives(
                subject=title,
                body=message_text,
                from_email="system@ewsd.edu",
                to=["system@ewsd.edu"],
                bcc=email_addresses,
            )
            email_message.attach_alternative(html_message, "text/html")
            email_message.send(fail_silently=True)
        except (BadHeaderError, OSError):
            pass


def _dispatch_new_announcement_notifications_async(*, announcement):
    def _start_notification_thread():
        threading.Thread(
            target=_notify_new_announcement,
            kwargs={"announcement": announcement},
            daemon=True,
        ).start()

    transaction.on_commit(_start_notification_thread)


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
        _dispatch_new_announcement_notifications_async(announcement=announcement)
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
