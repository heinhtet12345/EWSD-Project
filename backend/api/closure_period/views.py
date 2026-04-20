import threading

from django.contrib.auth import get_user_model
from django.core.mail import BadHeaderError, send_mail
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated

from api.models import Notification
from .serializer import ClosurePeriodSerializer
from .models import ClosurePeriod

User = get_user_model()


def _normalized_role(user) -> str:
    role_name = getattr(getattr(user, "role", None), "role_name", "") or ""
    return role_name.strip().lower().replace(" ", "_")


def _build_closure_period_email(*, title, intro, details, closing_note):
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


def _closure_notification_recipients():
    return [
        user
        for user in User.objects.select_related("role")
        if _normalized_role(user) in {"qa_coordinator", "staff"} and bool(getattr(user, "active_status", True))
    ]


def _notify_closure_period_change(*, title, message, notification_type, email_details=None, closing_note=None):
    recipients = _closure_notification_recipients()
    email_details = email_details or []
    closing_note = closing_note or "Please log in to the platform for the latest closure period information."
    emailed_addresses: set[str] = set()

    for recipient in recipients:
        Notification.objects.create(
            recipient=recipient,
            title=title,
            message=message,
            notification_type=notification_type,
        )

        if recipient.email:
            normalized_email = str(recipient.email).strip().lower()
            if normalized_email in emailed_addresses:
                continue
            try:
                message_text, html_message = _build_closure_period_email(
                    title=title,
                    intro=message,
                    details=email_details,
                    closing_note=closing_note,
                )
                send_mail(
                    subject=title,
                    message=message_text,
                    from_email="system@ewsd.edu",
                    recipient_list=[recipient.email],
                    html_message=html_message,
                    fail_silently=True,
                )
                emailed_addresses.add(normalized_email)
            except (BadHeaderError, OSError):
                continue


def _dispatch_closure_period_notifications_async(*, title, message, notification_type, email_details=None, closing_note=None):
    threading.Thread(
        target=_notify_closure_period_change,
        kwargs={
            "title": title,
            "message": message,
            "notification_type": notification_type,
            "email_details": email_details or [],
            "closing_note": closing_note,
        },
        daemon=True,
    ).start()


class AddClosurePeriodView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        if _normalized_role(request.user) not in {"qa_manager", "admin"}:
            return Response(
                {"message": "Not authorized. QA Manager or Admin role required."},
                status=status.HTTP_403_FORBIDDEN
            )

        serializer = ClosurePeriodSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        closure_period = serializer.save()

        _dispatch_closure_period_notifications_async(
            title="New closure period started",
            message=(
                f'A new closure period for "{closure_period.academic_year}" has started.'
            ),
            notification_type="closure_period_created",
            email_details=[
                ("Academic Year", closure_period.academic_year),
                ("Start Date", closure_period.start_date),
                ("Idea Deadline", closure_period.idea_closure_date),
                ("Comment Deadline", closure_period.comment_closure_date),
            ],
            closing_note="Please review the updated submission timeline and plan your idea and comment activities accordingly.",
        )

        return Response(ClosurePeriodSerializer(closure_period).data, status=status.HTTP_201_CREATED)
    
class ViewClosurePeriodView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        # Show newest closure periods first (by creation/start_date).
        closureperiod = ClosurePeriod.objects.order_by('-start_date', '-id')
        serializer = ClosurePeriodSerializer(closureperiod, many=True)

        return Response({
            "results": serializer.data
        })


class UpdateClosurePeriodView(APIView):
    permission_classes = [IsAuthenticated]

    def patch(self, request, closure_period_id):
        if _normalized_role(request.user) not in {"qa_manager", "admin"}:
            return Response(
                {"message": "Not authorized. QA Manager or Admin role required."},
                status=status.HTTP_403_FORBIDDEN,
            )

        closure_period = ClosurePeriod.objects.filter(id=closure_period_id).first()
        if not closure_period:
            return Response({"message": "Closure period not found."}, status=status.HTTP_404_NOT_FOUND)

        previous_idea_closure_date = closure_period.idea_closure_date
        previous_comment_closure_date = closure_period.comment_closure_date
        serializer = ClosurePeriodSerializer(closure_period, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        updated_closure_period = serializer.save()

        changed_parts = []
        if updated_closure_period.idea_closure_date != previous_idea_closure_date:
            changed_parts.append(
                f"Idea deadline moved from {previous_idea_closure_date} to {updated_closure_period.idea_closure_date}"
            )
        if updated_closure_period.comment_closure_date != previous_comment_closure_date:
            changed_parts.append(
                f"Comment deadline moved from {previous_comment_closure_date} to {updated_closure_period.comment_closure_date}"
            )

        if changed_parts:
            _dispatch_closure_period_notifications_async(
                title="Closure period extended",
                message=(
                    f'Closure period "{updated_closure_period.academic_year}" was extended. '
                    + " | ".join(changed_parts)
                ),
                notification_type="closure_period_extended",
                email_details=[
                    ("Academic Year", updated_closure_period.academic_year),
                    *[
                        ("Deadline Update", part)
                        for part in changed_parts
                    ],
                ],
                closing_note="Please review the revised deadlines in the platform before submitting ideas or comments.",
            )

        return Response(ClosurePeriodSerializer(updated_closure_period).data, status=status.HTTP_200_OK)
