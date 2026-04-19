from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework import status
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError

from ..password_rules import validate_custom_password_rules
from ..serializer import UserProfileSerializer, UserLoginSessionSerializer
from ..session_store import (
    get_login_session,
    list_user_login_sessions,
    revoke_all_user_login_sessions,
    revoke_login_session,
)


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
        sessions = list_user_login_sessions(request.user.pk)
        for session in sessions:
            session["is_active"] = True
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
            sessions = revoke_all_user_login_sessions(request.user.pk)
            revoked_ids = [str(session["session_id"]) for session in sessions]
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

        login_session = get_login_session(str(session_id))
        if not login_session:
            return Response({"message": "Session not found."}, status=status.HTTP_404_NOT_FOUND)

        if str(login_session.get("user_id")) != str(request.user.pk):
            return Response({"message": "Session not found."}, status=status.HTTP_404_NOT_FOUND)

        revoke_login_session(str(session_id))

        return Response(
            {
                "message": "Session removed successfully.",
                "revoked_session_ids": [str(login_session["session_id"])],
                "current_session_revoked": str(login_session["session_id"]) == current_session_id if current_session_id else False,
            },
            status=status.HTTP_200_OK,
        )
