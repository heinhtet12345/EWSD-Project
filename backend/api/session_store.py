import json
from datetime import datetime, timezone as dt_timezone
from typing import Any

from django.conf import settings
from django.core.exceptions import ImproperlyConfigured
from django.utils import timezone
from django.utils.dateparse import parse_datetime


SESSION_KEY_PREFIX = "login_session"
USER_SESSIONS_KEY_PREFIX = "user_login_sessions"
REFRESH_JTI_KEY_PREFIX = "refresh_jti_session"


def _get_redis_client():
    try:
        import redis
    except ImportError as exc:
        raise ImproperlyConfigured(
            "The 'redis' package is required for Redis-backed login sessions."
        ) from exc

    redis_url = getattr(settings, "REDIS_URL", "").strip()
    if not redis_url:
        raise ImproperlyConfigured("REDIS_URL is not configured.")

    return redis.Redis.from_url(redis_url, decode_responses=True)


def _session_key(session_id: str) -> str:
    return f"{SESSION_KEY_PREFIX}:{session_id}"


def _user_sessions_key(user_id: int | str) -> str:
    return f"{USER_SESSIONS_KEY_PREFIX}:{user_id}"


def _refresh_jti_key(refresh_jti: str) -> str:
    return f"{REFRESH_JTI_KEY_PREFIX}:{refresh_jti}"


def _serialize_session(data: dict[str, Any]) -> str:
    return json.dumps(data)


def _deserialize_session(raw_value: str | None) -> dict[str, Any] | None:
    if not raw_value:
        return None
    return json.loads(raw_value)


def _now_iso() -> str:
    return timezone.now().isoformat()


def _parse_sortable_datetime(value: str) -> datetime:
    parsed = parse_datetime(value) if value else None
    if parsed is None:
        return datetime.min.replace(tzinfo=dt_timezone.utc)
    if timezone.is_naive(parsed):
        return timezone.make_aware(parsed, dt_timezone.utc)
    return parsed


def create_login_session(
    *,
    session_id: str,
    user_id: int,
    refresh_jti: str,
    ttl_seconds: int,
    device_type: str = "",
    browser: str = "",
    operating_system: str = "",
    ip_address: str | None = None,
    user_agent: str = "",
) -> dict[str, Any]:
    now = _now_iso()
    session_data = {
        "session_id": session_id,
        "user_id": str(user_id),
        "refresh_jti": refresh_jti,
        "device_type": device_type,
        "browser": browser,
        "operating_system": operating_system,
        "ip_address": ip_address or "",
        "user_agent": user_agent,
        "created_at": now,
        "last_used_at": now,
        "revoked_at": None,
    }

    client = _get_redis_client()
    client.setex(_session_key(session_id), ttl_seconds, _serialize_session(session_data))
    client.sadd(_user_sessions_key(user_id), session_id)
    client.setex(_refresh_jti_key(refresh_jti), ttl_seconds, session_id)
    return session_data


def get_login_session(session_id: str) -> dict[str, Any] | None:
    client = _get_redis_client()
    return _deserialize_session(client.get(_session_key(session_id)))


def get_session_id_by_refresh_jti(refresh_jti: str) -> str | None:
    client = _get_redis_client()
    return client.get(_refresh_jti_key(refresh_jti))


def touch_login_session(session_id: str) -> dict[str, Any] | None:
    client = _get_redis_client()
    key = _session_key(session_id)
    ttl_seconds = client.ttl(key)
    if ttl_seconds is None or ttl_seconds <= 0:
        return None

    session_data = _deserialize_session(client.get(key))
    if not session_data:
        return None

    session_data["last_used_at"] = _now_iso()
    client.setex(key, ttl_seconds, _serialize_session(session_data))
    refresh_jti = session_data.get("refresh_jti", "")
    if refresh_jti:
        client.expire(_refresh_jti_key(refresh_jti), ttl_seconds)
    return session_data


def revoke_login_session(session_id: str) -> dict[str, Any] | None:
    client = _get_redis_client()
    session_data = get_login_session(session_id)
    if not session_data:
        return None

    pipeline = client.pipeline()
    pipeline.delete(_session_key(session_id))
    pipeline.srem(_user_sessions_key(session_data["user_id"]), session_id)
    refresh_jti = session_data.get("refresh_jti", "")
    if refresh_jti:
        pipeline.delete(_refresh_jti_key(refresh_jti))
    pipeline.execute()
    return session_data


def list_user_login_sessions(user_id: int) -> list[dict[str, Any]]:
    client = _get_redis_client()
    session_ids = client.smembers(_user_sessions_key(user_id))
    sessions: list[dict[str, Any]] = []
    stale_ids: list[str] = []

    for session_id in session_ids:
        session_data = _deserialize_session(client.get(_session_key(session_id)))
        if not session_data:
            stale_ids.append(session_id)
            continue
        if str(session_data.get("user_id")) != str(user_id):
            continue
        sessions.append(session_data)

    if stale_ids:
        client.srem(_user_sessions_key(user_id), *stale_ids)

    sessions.sort(
        key=lambda item: (
            _parse_sortable_datetime(item.get("last_used_at", "")),
            _parse_sortable_datetime(item.get("created_at", "")),
        ),
        reverse=True,
    )
    return sessions


def revoke_all_user_login_sessions(user_id: int) -> list[dict[str, Any]]:
    sessions = list_user_login_sessions(user_id)
    for session in sessions:
        revoke_login_session(str(session["session_id"]))
    return sessions
