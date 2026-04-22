from rest_framework.exceptions import AuthenticationFailed
from rest_framework_simplejwt.authentication import JWTAuthentication

from .session_store import get_login_session, touch_login_session


class SessionAwareJWTAuthentication(JWTAuthentication):
    def authenticate(self, request):
        result = super().authenticate(request)
        if result is None:
            return None

        user, validated_token = result
        session_id = validated_token.get("session_id")
        if not session_id:
            raise AuthenticationFailed("Session is invalid.", code="session_invalid")

        login_session = get_login_session(str(session_id))
        if not login_session:
            raise AuthenticationFailed("Session has been revoked.", code="session_revoked")
        if str(login_session.get("user_id")) != str(user.pk):
            raise AuthenticationFailed("Session is invalid.", code="session_invalid")

        touch_login_session(str(session_id))
        return user, validated_token
