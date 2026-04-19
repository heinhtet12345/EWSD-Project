from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.exceptions import AuthenticationFailed
from django.contrib.auth.models import update_last_login
from django.conf import settings
from ..serializer import LoginSerializer, UserSerializer
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.views import TokenRefreshView
from rest_framework_simplejwt.serializers import TokenRefreshSerializer
from rest_framework_simplejwt.exceptions import InvalidToken, TokenError
from ..analytics.models import ActivityLog
from ..session_store import (
    create_login_session,
    get_login_session,
    get_session_id_by_refresh_jti,
    revoke_login_session,
    touch_login_session,
)
import requests
import uuid


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


def _extract_client_ip(request) -> str | None:
    forwarded_for = request.META.get("HTTP_X_FORWARDED_FOR")
    if forwarded_for:
        return forwarded_for.split(",")[0].strip() or None
    return request.META.get("REMOTE_ADDR") or None


def _get_login_session_ttl_seconds() -> int:
    return int(settings.SIMPLE_JWT["REFRESH_TOKEN_LIFETIME"].total_seconds())

class LoginView(APIView):

    def post(self, request):
        # --- reCAPTCHA v2 verification ---
        recaptcha_token = request.data.get("recaptcha")
        if not recaptcha_token:
            return Response({"message": "reCAPTCHA validation failed. Please try again."}, status=status.HTTP_400_BAD_REQUEST)

        recaptcha_secret = "6LfaqrIsAAAAAJB9ygpNIHrD_q1nDO-gshIT1LaU"
        recaptcha_url = "https://www.google.com/recaptcha/api/siteverify"
        recaptcha_response = requests.post(
            recaptcha_url,
            data={
                "secret": recaptcha_secret,
                "response": recaptcha_token,
                "remoteip": request.META.get("REMOTE_ADDR"),
            },
            timeout=5
        )
        recaptcha_result = recaptcha_response.json()
        if not recaptcha_result.get("success"):
            return Response({"message": "reCAPTCHA verification failed. Please try again."}, status=status.HTTP_400_BAD_REQUEST)

        # --- End reCAPTCHA verification ---

        serializer = LoginSerializer(data=request.data)

        if serializer.is_valid():
            user = serializer.validated_data['user']
            previous_last_login = user.last_login

            # Legacy compatibility: older disable flow set is_active=False.
            # Keep login allowed and use active_status for feature restrictions.
            if not user.is_active and not bool(getattr(user, "active_status", True)):
                user.is_active = True
                user.save(update_fields=["is_active"])

            update_last_login(None, user)

            #generate token jwt
            refresh = RefreshToken.for_user(user)
            session_id = uuid.uuid4()
            refresh["session_id"] = str(session_id)
            access_token = str(refresh.access_token)
            refresh_token = str(refresh)
            refresh_jti = str(refresh["jti"])

            # to get user info
            user_data = UserSerializer(user).data

            user_agent = request.META.get("HTTP_USER_AGENT", "")
            login_session = create_login_session(
                session_id=str(session_id),
                user_id=user.pk,
                refresh_jti=refresh_jti,
                ttl_seconds=_get_login_session_ttl_seconds(),
                browser=_extract_browser(user_agent),
                operating_system=_extract_os(user_agent),
                device_type=_extract_device_type(user_agent),
                ip_address=_extract_client_ip(request),
                user_agent=user_agent,
            )
            ActivityLog.objects.create(
                user=user,
                event_type="login",
                path="/api/login/",
                browser=_extract_browser(user_agent),
                operating_system=_extract_os(user_agent),
                device_type=_extract_device_type(user_agent),
                metadata={},
            )

            return Response({
                "message": "Login successful",
                "user_id": user.user_id,
                "username": user.username,
                "first_name": user_data.get("first_name", ""),
                "last_name": user_data.get("last_name", ""),
                "name": user_data.get("name", ""),
                "role": user_data.get("role_name", "No Role Assigned"),
                "department": user_data.get("department_name", "No Department Assigned"),
                "active_status": user_data.get("active_status", True),
                "profile_image": user_data.get("profile_image", None),
                "first_login": previous_last_login is None,
                "last_login_at": previous_last_login,
                "access": access_token,
                "refresh": refresh_token,
                "session_id": str(login_session["session_id"]),
            })

        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class LogoutView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        refresh_token = request.data.get("refresh")
        if not refresh_token:
            return Response({"message": "Refresh token is required."}, status=status.HTTP_400_BAD_REQUEST)

        try:
            refresh = RefreshToken(refresh_token)
            session_id = get_session_id_by_refresh_jti(str(refresh["jti"]))
            if session_id:
                session = get_login_session(session_id)
                if session and str(session.get("user_id")) != str(request.user.pk):
                    raise AuthenticationFailed("Session does not belong to the current user.")
                revoke_login_session(session_id)
        except Exception:
            return Response({"message": "Invalid refresh token."}, status=status.HTTP_400_BAD_REQUEST)

        return Response({"message": "Logged out successfully."}, status=status.HTTP_200_OK)


class SessionAwareTokenRefreshSerializer(TokenRefreshSerializer):
    def validate(self, attrs):
        raw_refresh_token = attrs.get("refresh", "")

        try:
            refresh = RefreshToken(raw_refresh_token)
        except TokenError as exc:
            raise InvalidToken(str(exc)) from exc

        session_id = str(refresh.get("session_id", "")).strip()
        if not session_id:
            raise InvalidToken("Session is invalid.")

        login_session = get_login_session(session_id)
        if not login_session:
            raise InvalidToken("Session has been revoked.")

        if str(login_session.get("user_id")) != str(refresh.get("user_id")):
            raise InvalidToken("Session is invalid.")

        touch_login_session(session_id)
        return super().validate(attrs)


class SessionAwareTokenRefreshView(TokenRefreshView):
    serializer_class = SessionAwareTokenRefreshSerializer
