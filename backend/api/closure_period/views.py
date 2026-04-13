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


def _closure_notification_recipients():
    return [
        user
        for user in User.objects.select_related("role")
        if _normalized_role(user) in {"qa_coordinator", "staff"} and bool(getattr(user, "active_status", True))
    ]


def _notify_closure_period_change(*, title, message, notification_type):
    recipients = _closure_notification_recipients()

    for recipient in recipients:
        Notification.objects.create(
            recipient=recipient,
            title=title,
            message=message,
            notification_type=notification_type,
        )

        if recipient.email:
            try:
                send_mail(
                    subject=title,
                    message=message,
                    from_email="system@ewsd.edu",
                    recipient_list=[recipient.email],
                    fail_silently=True,
                )
            except (BadHeaderError, OSError):
                continue


def _dispatch_closure_period_notifications_async(*, title, message, notification_type):
    threading.Thread(
        target=_notify_closure_period_change,
        kwargs={
            "title": title,
            "message": message,
            "notification_type": notification_type,
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
                f'A new closure period "{closure_period.academic_year}" has started. '
                f'Idea deadline: {closure_period.idea_closure_date}. '
                f'Comment deadline: {closure_period.comment_closure_date}.'
            ),
            notification_type="closure_period_created",
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
            )

        return Response(ClosurePeriodSerializer(updated_closure_period).data, status=status.HTTP_200_OK)
