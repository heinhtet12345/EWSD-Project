from django.contrib.auth import get_user_model
from django.core.mail import BadHeaderError, send_mail
from rest_framework import permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from ..models import Notification
from ..serializer import UserSerializer

User = get_user_model()


def _normalized_role(user) -> str:
    role_name = getattr(getattr(user, "role", None), "role_name", "") or ""
    return role_name.strip().lower().replace(" ", "_")


def _admin_users_queryset():
    return [user for user in User.objects.select_related("role") if _normalized_role(user) == "admin"]


class ForgotPasswordRequestView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        username = str(request.data.get("username", "")).strip()
        if not username:
            return Response({"message": "Username is required."}, status=status.HTTP_400_BAD_REQUEST)

        target_user = User.objects.filter(username=username).first()
        if not target_user:
            return Response({"message": "Username not found."}, status=status.HTTP_404_NOT_FOUND)

        admins = _admin_users_queryset()
        if not admins:
            return Response({"message": "No admin user available."}, status=status.HTTP_400_BAD_REQUEST)

        for admin in admins:
            Notification.objects.create(
                recipient=admin,
                title="Password reset request",
                message=f'User "{target_user.username}" requested a password reset.',
                notification_type="password_reset_request",
            )

            if admin.email:
                try:
                    send_mail(
                        subject="Password Reset Request",
                        message=f'User "{target_user.username}" requested a password reset.',
                        from_email="system@ewsd.edu",
                        recipient_list=[admin.email],
                        fail_silently=True,
                    )
                except (BadHeaderError, OSError):
                    continue

        return Response(
            {"message": "Password reset request sent to admin."},
            status=status.HTTP_200_OK,
        )


class AdminUserListView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        if _normalized_role(request.user) != "admin":
            return Response({"message": "Not authorized."}, status=status.HTTP_403_FORBIDDEN)

        users = User.objects.select_related("role", "department").order_by("username")
        serializer = UserSerializer(users, many=True)
        return Response({"results": serializer.data}, status=status.HTTP_200_OK)


class AdminResetUserPasswordView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, user_id):
        if _normalized_role(request.user) != "admin":
            return Response({"message": "Not authorized."}, status=status.HTTP_403_FORBIDDEN)

        target_user = User.objects.filter(user_id=user_id).first()
        if not target_user:
            return Response({"message": "User not found."}, status=status.HTTP_404_NOT_FOUND)

        new_password = "pass123"
        target_user.set_password(new_password)
        target_user.save()

        Notification.objects.create(
            recipient=target_user,
            title="Your password has been reset",
            message='Your password was reset by admin. Temporary password: "pass123".',
            notification_type="password_reset_done",
        )

        if target_user.email:
            try:
                send_mail(
                    subject="Your Password Has Been Reset",
                    message='Your password has been reset by admin. Temporary password: "pass123".',
                    from_email="system@ewsd.edu",
                    recipient_list=[target_user.email],
                    fail_silently=True,
                )
            except (BadHeaderError, OSError):
                pass

        return Response({"message": "Password reset to pass123."}, status=status.HTTP_200_OK)
