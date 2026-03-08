from django.contrib.auth import get_user_model
from django.core.mail import BadHeaderError, send_mail
from django.utils import timezone
from rest_framework import permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from ..models import Department, Notification, Role
from ..serializer import UserSerializer

User = get_user_model()


def _normalized_role(user) -> str:
    role_name = getattr(getattr(user, "role", None), "role_name", "") or ""
    return role_name.strip().lower().replace(" ", "_")


def _normalized_role_name(role_name: str) -> str:
    return str(role_name or "").strip().lower().replace(" ", "_")


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


class AdminUserMetaView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        if _normalized_role(request.user) != "admin":
            return Response({"message": "Not authorized."}, status=status.HTTP_403_FORBIDDEN)

        roles = list(Role.objects.order_by("role_name").values_list("role_name", flat=True))
        departments = list(Department.objects.order_by("dept_name").values_list("dept_name", flat=True))
        return Response({"roles": roles, "departments": departments}, status=status.HTTP_200_OK)


class AdminCreateUserView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        if _normalized_role(request.user) != "admin":
            return Response({"message": "Not authorized."}, status=status.HTTP_403_FORBIDDEN)

        username = str(request.data.get("username", "")).strip()
        email = str(request.data.get("email", "")).strip()
        name = str(request.data.get("name", "")).strip()
        role_name = str(request.data.get("role_name", "")).strip()
        department_name = str(request.data.get("department_name", "")).strip()

        if not username:
            return Response({"message": "Username is required."}, status=status.HTTP_400_BAD_REQUEST)
        if not email:
            return Response({"message": "Email is required."}, status=status.HTTP_400_BAD_REQUEST)
        if not role_name:
            return Response({"message": "Role is required."}, status=status.HTTP_400_BAD_REQUEST)

        if User.objects.filter(username__iexact=username).exists():
            return Response({"message": "Username already exists."}, status=status.HTTP_400_BAD_REQUEST)
        if User.objects.filter(email__iexact=email).exists():
            return Response({"message": "Email already exists."}, status=status.HTTP_400_BAD_REQUEST)

        role_obj = Role.objects.filter(role_name__iexact=role_name).first()
        if not role_obj:
            return Response({"message": "Invalid role."}, status=status.HTTP_400_BAD_REQUEST)

        normalized_selected_role = _normalized_role_name(role_obj.role_name)
        if normalized_selected_role == "qa_manager":
            qa_manager_role_names = {"qa_manager", "qa manager"}
            manager_exists = any(
                _normalized_role_name(existing_role_name) in qa_manager_role_names
                for existing_role_name in User.objects.select_related("role").values_list("role__role_name", flat=True)
                if existing_role_name
            )
            if manager_exists:
                return Response({"message": "Only one QA Manager is allowed."}, status=status.HTTP_400_BAD_REQUEST)

        requires_department = normalized_selected_role in {"qa_coordinator", "qa coordinator", "staff"}
        department_obj = None
        if requires_department:
            if not department_name:
                return Response(
                    {"message": "Department is required for QA Coordinator and Staff."},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            department_obj = Department.objects.filter(dept_name__iexact=department_name).first()
            if not department_obj:
                return Response({"message": "Invalid department."}, status=status.HTTP_400_BAD_REQUEST)
        elif department_name:
            department_obj = Department.objects.filter(dept_name__iexact=department_name).first()

        user = User(
            username=username,
            email=email,
            first_name=name,
            role=role_obj,
            department=department_obj,
            hire_date=timezone.now().date(),
            active_status=True,
            is_active=True,
        )
        user.set_password("pass123")
        user.save()

        serializer = UserSerializer(user)
        return Response(
            {
                "message": f'User "{username}" created. Temporary password is pass123.',
                "user": serializer.data,
            },
            status=status.HTTP_201_CREATED,
        )


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
            notification_type="password_reset_request",
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


class AdminDisableUserAccountView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, user_id):
        if _normalized_role(request.user) != "admin":
            return Response({"message": "Not authorized."}, status=status.HTTP_403_FORBIDDEN)

        target_user = User.objects.filter(user_id=user_id).first()
        if not target_user:
            return Response({"message": "User not found."}, status=status.HTTP_404_NOT_FOUND)

        if _normalized_role(target_user) == "admin":
            return Response({"message": "Cannot disable admin account."}, status=status.HTTP_400_BAD_REQUEST)

        # Keep Django auth active so user can still log in and read notifications.
        target_user.active_status = False
        target_user.is_active = True
        target_user.save(update_fields=["active_status", "is_active"])

        Notification.objects.create(
            recipient=target_user,
            title="Account disabled",
            message="Your account has been disabled by admin.",
            notification_type="account_disabled",
        )

        return Response({"message": f'Account "{target_user.username}" disabled.'}, status=status.HTTP_200_OK)


class AdminEnableUserAccountView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, user_id):
        if _normalized_role(request.user) != "admin":
            return Response({"message": "Not authorized."}, status=status.HTTP_403_FORBIDDEN)

        target_user = User.objects.filter(user_id=user_id).first()
        if not target_user:
            return Response({"message": "User not found."}, status=status.HTTP_404_NOT_FOUND)

        target_user.active_status = True
        target_user.is_active = True
        target_user.save(update_fields=["active_status", "is_active"])

        Notification.objects.create(
            recipient=target_user,
            title="Account enabled",
            message="Your account has been enabled by admin.",
            notification_type="account_enabled",
        )

        return Response({"message": f'Account "{target_user.username}" enabled.'}, status=status.HTTP_200_OK)
