from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework import status
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError
from django.utils import timezone
from rest_framework_simplejwt.tokens import RefreshToken

from ..password_rules import validate_custom_password_rules
from ..serializer import UserProfileSerializer, UserLoginSessionSerializer
from ..models import UserLoginSession


class UserProfileView(APIView):
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def get(self, request):
        serializer = UserProfileSerializer(request.user)
        return Response(serializer.data, status=status.HTTP_200_OK)

    def patch(self, request):
        serializer = UserProfileSerializer(
            request.user,
            data=request.data,
            partial=True,
        )
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data, status=status.HTTP_200_OK)


class ChangePasswordView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        old_password = request.data.get('old_password', '')
        new_password = request.data.get('new_password', '')
        confirm_password = request.data.get('confirm_password', '')

        if not old_password or not new_password or not confirm_password:
            return Response(
                {'message': 'Old password, new password, and confirm password are required.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if not request.user.check_password(old_password):
            return Response({'message': 'Old password is incorrect.'}, status=status.HTTP_400_BAD_REQUEST)

        if new_password != confirm_password:
            return Response({'message': 'New password and confirm password do not match.'}, status=status.HTTP_400_BAD_REQUEST)

        custom_error = validate_custom_password_rules(new_password)
        if custom_error:
            return Response({'message': custom_error}, status=status.HTTP_400_BAD_REQUEST)

        known_bad_passwords = {'password', '123456', '12345678', 'qwerty', 'abc123', 'password123'}
        if new_password.lower() in known_bad_passwords:
            return Response(
                {'message': 'This password is too common or unsafe. Please choose a stronger password.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            validate_password(new_password, user=request.user)
        except ValidationError as exc:
            return Response({'message': ' '.join(exc.messages)}, status=status.HTTP_400_BAD_REQUEST)

        request.user.set_password(new_password)
        request.user.save()
        return Response({'message': 'Password changed successfully.'}, status=status.HTTP_200_OK)


class UserSessionListView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        current_session_id = request.query_params.get("current_session_id", "").strip()
        sessions = UserLoginSession.objects.filter(user=request.user, revoked_at__isnull=True).order_by("-last_used_at", "-created_at")
        serializer = UserLoginSessionSerializer(sessions, many=True)
        return Response(
            {
                "results": [
                    {
                        **session,
                        "is_current": str(session["session_id"]) == current_session_id,
                    }
                    for session in serializer.data
                ]
            },
            status=status.HTTP_200_OK,
        )


class UserSessionRevokeView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, session_id=None):
        password = request.data.get("password", "")
        revoke_all = bool(request.data.get("revoke_all"))
        current_session_id = str(request.data.get("current_session_id", "")).strip()

        if not password:
            return Response({"message": "Password is required."}, status=status.HTTP_400_BAD_REQUEST)

        if not request.user.check_password(password):
            return Response({"message": "Password is incorrect."}, status=status.HTTP_400_BAD_REQUEST)

        if revoke_all:
            sessions = UserLoginSession.objects.filter(user=request.user, revoked_at__isnull=True)
            revoked_ids: list[str] = []
            for login_session in sessions:
                revoked_ids.append(str(login_session.session_id))
                try:
                    refresh = RefreshToken(login_session.refresh_token)
                    refresh.blacklist()
                except Exception:
                    continue
            sessions.update(revoked_at=timezone.now())
            return Response(
                {
                    "message": "All sessions were removed successfully.",
                    "revoked_session_ids": revoked_ids,
                    "current_session_revoked": current_session_id in revoked_ids if current_session_id else False,
                },
                status=status.HTTP_200_OK,
            )

        if session_id is None:
            return Response({"message": "Session id is required."}, status=status.HTTP_400_BAD_REQUEST)

        login_session = UserLoginSession.objects.filter(
            user=request.user,
            session_id=session_id,
        ).first()
        if not login_session:
            return Response({"message": "Session not found."}, status=status.HTTP_404_NOT_FOUND)

        if login_session.revoked_at is None:
            try:
                refresh = RefreshToken(login_session.refresh_token)
                refresh.blacklist()
            except Exception:
                return Response({"message": "Unable to revoke session."}, status=status.HTTP_400_BAD_REQUEST)
            login_session.revoked_at = timezone.now()
            login_session.save(update_fields=["revoked_at", "last_used_at"])

        return Response(
            {
                "message": "Session removed successfully.",
                "revoked_session_ids": [str(login_session.session_id)],
                "current_session_revoked": str(login_session.session_id) == current_session_id if current_session_id else False,
            },
            status=status.HTTP_200_OK,
        )
