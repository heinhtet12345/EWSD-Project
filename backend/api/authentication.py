from django.utils import timezone
from rest_framework.exceptions import AuthenticationFailed
from rest_framework_simplejwt.authentication import JWTAuthentication

from .models import UserLoginSession


class SessionAwareJWTAuthentication(JWTAuthentication):
    def authenticate(self, request):
        result = super().authenticate(request)
        if result is None:
            return None

        user, validated_token = result
        session_id = validated_token.get("session_id")
        if not session_id:
            raise AuthenticationFailed("Session is invalid.", code="session_invalid")

        login_session = UserLoginSession.objects.filter(
            user=user,
            session_id=session_id,
            revoked_at__isnull=True,
        ).first()
        if not login_session:
            raise AuthenticationFailed("Session has been revoked.", code="session_revoked")

        UserLoginSession.objects.filter(session_id=login_session.session_id).update(last_used_at=timezone.now())
        return user, validated_token
