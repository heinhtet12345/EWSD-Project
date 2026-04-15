from django.contrib.auth import get_user_model
from django.core.mail import BadHeaderError, send_mail
from django.db import transaction
from django.utils import timezone
from rest_framework import permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from ..models import Department, Notification, Role
from ..serializer import UserSerializer
from ..IdeaPost.models import Idea
from ..interaction.models import Comment

User = get_user_model()
TEMPORARY_PASSWORD = "Pass@123"
DELETED_USER_ID = 0


def _build_admin_email(*, title, greeting, intro, details, closing_note):
    message = (
        f"{greeting}\n\n"
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
                    <p style="margin:0 0 16px;font-size:15px;line-height:1.7;">{greeting}</p>
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


def _normalized_role(user) -> str:
    role_name = getattr(getattr(user, "role", None), "role_name", "") or ""
    return role_name.strip().lower().replace(" ", "_")


def _normalized_role_name(role_name: str) -> str:
    return str(role_name or "").strip().lower().replace(" ", "_")


def _admin_users_queryset():
    return [user for user in User.objects.select_related("role") if _normalized_role(user) == "admin"]


def _get_deleted_user():
    deleted_user, _ = User.objects.get_or_create(
        user_id=DELETED_USER_ID,
        defaults={
            "username": "deleted_user",
            "email": "deleted_user@system.local",
            "first_name": "Deleted",
            "last_name": "User",
            "is_active": False,
            "active_status": False,
        },
    )
    return deleted_user


def _requester_can_toggle_user(requester, target_user) -> bool:
    requester_role = _normalized_role(requester)
    target_role = _normalized_role(target_user)

    if requester_role == "admin":
        return target_role != "admin"

    if requester_role == "qa_manager":
        return target_role in {"staff", "qa_coordinator"}

    return False


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
                    message_text, html_message = _build_admin_email(
                        title="Password Reset Request",
                        greeting="Dear Admin,",
                        intro="A user has submitted a password reset request through the university idea management system.",
                        details=[
                            ("Username", target_user.username),
                            ("Email", target_user.email or "Not provided"),
                        ],
                        closing_note="Please review the request and reset the password if appropriate.",
                    )
                    send_mail(
                        subject="Password Reset Request",
                        message=message_text,
                        from_email="system@ewsd.edu",
                        recipient_list=[admin.email],
                        html_message=html_message,
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
        requester_role = _normalized_role(request.user)
        if requester_role not in {"admin", "qa_manager"}:
            return Response({"message": "Not authorized."}, status=status.HTTP_403_FORBIDDEN)

        users_queryset = User.objects.select_related("role", "department").exclude(user_id=DELETED_USER_ID).order_by("username")
        if requester_role == "qa_manager":
            allowed_roles = {"staff", "qa_coordinator"}
            users = [user for user in users_queryset if _normalized_role(user) in allowed_roles]
        else:
            users = users_queryset

        serializer = UserSerializer(users, many=True)
        return Response({"results": serializer.data}, status=status.HTTP_200_OK)


class AdminUserMetaView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        if _normalized_role(request.user) != "admin":
            return Response({"message": "Not authorized."}, status=status.HTTP_403_FORBIDDEN)

        roles = [
            role_name
            for role_name in Role.objects.order_by("role_name").values_list("role_name", flat=True)
            if _normalized_role_name(role_name) != "admin"
        ]
        departments = list(Department.objects.order_by("dept_name").values_list("dept_name", flat=True))
        return Response({"roles": roles, "departments": departments}, status=status.HTTP_200_OK)


class CoordinatorDepartmentStaffListView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        if _normalized_role(request.user) != "qa_coordinator":
            return Response({"message": "Not authorized."}, status=status.HTTP_403_FORBIDDEN)

        department = getattr(request.user, "department", None)
        if not department:
            return Response({"results": []}, status=status.HTTP_200_OK)

        staff_users = (
            User.objects.select_related("role", "department")
            .filter(
                department=department,
                role__role_name__iexact="staff",
            )
            .order_by("username")
        )

        serializer = UserSerializer(staff_users, many=True)
        return Response({"results": serializer.data}, status=status.HTTP_200_OK)


class AdminCreateUserView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        if _normalized_role(request.user) != "admin":
            return Response({"message": "Not authorized."}, status=status.HTTP_403_FORBIDDEN)

        username = str(request.data.get("username", "")).strip()
        email = str(request.data.get("email", "")).strip()
        first_name = str(request.data.get("first_name", "")).strip()
        last_name = str(request.data.get("last_name", "")).strip()
        legacy_name = str(request.data.get("name", "")).strip()
        role_name = str(request.data.get("role_name", "")).strip()
        department_name = str(request.data.get("department_name", "")).strip()

        if not first_name and legacy_name:
            first_name = legacy_name

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
        if normalized_selected_role == "admin":
            return Response(
                {"message": "Admin account creation is not allowed from this form."},
                status=status.HTTP_400_BAD_REQUEST,
            )
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
            if normalized_selected_role == "qa_coordinator":
                coordinator_exists_in_department = (
                    User.objects.select_related("role")
                    .filter(
                        department=department_obj,
                        role__role_name__iexact="qa_coordinator",
                    )
                    .exists()
                )
                if coordinator_exists_in_department:
                    return Response(
                        {"message": f'A QA Coordinator already exists for "{department_obj.dept_name}".'},
                        status=status.HTTP_400_BAD_REQUEST,
                    )
        elif department_name:
            department_obj = Department.objects.filter(dept_name__iexact=department_name).first()

        user = User(
            username=username,
            email=email,
            first_name=first_name,
            last_name=last_name,
            role=role_obj,
            department=department_obj,
            hire_date=timezone.now().date(),
            active_status=True,
            is_active=True,
        )
        user.set_password(TEMPORARY_PASSWORD)
        user.save()

        serializer = UserSerializer(user)
        return Response(
            {
                "message": f'User "{username}" created. Temporary password is {TEMPORARY_PASSWORD}.',
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

        new_password = TEMPORARY_PASSWORD
        target_user.set_password(new_password)
        target_user.save()

        Notification.objects.create(
            recipient=target_user,
            title="Your password has been reset",
            message=f'Your password was reset by admin. Temporary password: "{TEMPORARY_PASSWORD}".',
            notification_type="password_reset_request",
        )

        if target_user.email:
            try:
                message_text, html_message = _build_admin_email(
                    title="Your Password Has Been Reset",
                    greeting=f"Dear {target_user.username},",
                    intro="Your account password has been reset by an administrator.",
                    details=[
                        ("Temporary Password", TEMPORARY_PASSWORD),
                    ],
                    closing_note="Please sign in using this temporary password and change it as soon as possible.",
                )
                send_mail(
                    subject="Your Password Has Been Reset",
                    message=message_text,
                    from_email="system@ewsd.edu",
                    recipient_list=[target_user.email],
                    html_message=html_message,
                    fail_silently=True,
                )
            except (BadHeaderError, OSError):
                pass

        return Response({"message": f"Password reset to {TEMPORARY_PASSWORD}."}, status=status.HTTP_200_OK)


class AdminDisableUserAccountView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, user_id):
        requester_role = _normalized_role(request.user)
        if requester_role not in {"admin", "qa_manager"}:
            return Response({"message": "Not authorized."}, status=status.HTTP_403_FORBIDDEN)

        target_user = User.objects.filter(user_id=user_id).first()
        if not target_user:
            return Response({"message": "User not found."}, status=status.HTTP_404_NOT_FOUND)

        if not _requester_can_toggle_user(request.user, target_user):
            return Response({"message": "Not authorized to disable this user."}, status=status.HTTP_403_FORBIDDEN)

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

        if target_user.email:
            try:
                message_text, html_message = _build_admin_email(
                    title="Account Disabled",
                    greeting=f"Dear {target_user.username},",
                    intro="Your account has been disabled by an administrator due to a policy or user agreement violation.",
                    details=[],
                    closing_note="If you believe this action was taken in error, please contact the system administrator for assistance.",
                )
                send_mail(
                    subject="Account Disabled",
                    message=message_text,
                    from_email="system@ewsd.edu",
                    recipient_list=[target_user.email],
                    html_message=html_message,
                    fail_silently=True,
                )
            except (BadHeaderError, OSError):
                pass

        return Response({"message": f'Account "{target_user.username}" disabled.'}, status=status.HTTP_200_OK)


class AdminEnableUserAccountView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, user_id):
        requester_role = _normalized_role(request.user)
        if requester_role not in {"admin", "qa_manager"}:
            return Response({"message": "Not authorized."}, status=status.HTTP_403_FORBIDDEN)

        target_user = User.objects.filter(user_id=user_id).first()
        if not target_user:
            return Response({"message": "User not found."}, status=status.HTTP_404_NOT_FOUND)

        if not _requester_can_toggle_user(request.user, target_user):
            return Response({"message": "Not authorized to enable this user."}, status=status.HTTP_403_FORBIDDEN)

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


class AdminDeleteUserAccountView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, user_id):
        requester_role = _normalized_role(request.user)
        if requester_role not in {"admin", "qa_manager"}:
            return Response({"message": "Not authorized."}, status=status.HTTP_403_FORBIDDEN)

        target_user = User.objects.select_related("role", "department").filter(user_id=user_id).first()
        if not target_user:
            return Response({"message": "User not found."}, status=status.HTTP_404_NOT_FOUND)
        if target_user.user_id == DELETED_USER_ID:
            return Response({"message": "The deleted user placeholder cannot be removed."}, status=status.HTTP_400_BAD_REQUEST)
        if request.user.user_id == target_user.user_id:
            return Response({"message": "You cannot delete your own account."}, status=status.HTTP_400_BAD_REQUEST)
        if not _requester_can_toggle_user(request.user, target_user):
            return Response({"message": "Not authorized to delete this user."}, status=status.HTTP_403_FORBIDDEN)

        deleted_user = _get_deleted_user()

        with transaction.atomic():
            Idea.objects.filter(user=target_user).update(user=deleted_user)
            Comment.objects.filter(user=target_user).update(user=deleted_user)
            target_username = target_user.username
            target_user.delete()

        return Response(
            {"message": f'Account "{target_username}" deleted. Related ideas and comments were reassigned to deleted_user.'},
            status=status.HTTP_200_OK,
        )
