"""Password hashing, CSRF tokens, login rate limiting, and HTTP security headers."""

from __future__ import annotations

import hashlib
import hmac
import secrets
from datetime import UTC, datetime, timedelta

from argon2 import PasswordHasher
from argon2.exceptions import VerifyMismatchError
from fastapi import Request
from sqlalchemy import select
from sqlalchemy.orm import Session
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import Response

from app.models import LoginAttempt

_PASSWORD_HASHER = PasswordHasher()

MAX_FAILED_ATTEMPTS = 5
LOCKOUT_MINUTES = 15


def hash_password(plain_password: str) -> str:
    """Hash a password using Argon2id."""
    return _PASSWORD_HASHER.hash(plain_password)


def verify_password(plain_password: str, password_hash: str) -> bool:
    """Verify a plain password against its stored Argon2 hash."""
    try:
        return _PASSWORD_HASHER.verify(password_hash, plain_password)
    except VerifyMismatchError:
        return False
    except Exception:
        return False


def get_csrf_token(request: Request) -> str:
    """Return the per-session CSRF token, creating one if absent."""
    token = request.session.get("csrf_token")
    if not token or not isinstance(token, str):
        token = secrets.token_urlsafe(32)
        request.session["csrf_token"] = token
    return token


def verify_csrf_token(request: Request, submitted_token: str | None) -> bool:
    """Compare submitted CSRF token with the session token using constant-time equality."""
    expected = request.session.get("csrf_token")
    if not expected or not submitted_token:
        return False
    return hmac.compare_digest(str(expected), str(submitted_token))


def _hash_rate_limit_key(raw_key: str) -> str:
    """Hash identifiers before storing rate-limit records so logs/tables hold no raw PII."""
    return hashlib.sha256(raw_key.strip().lower().encode("utf-8")).hexdigest()


def _as_utc(dt: datetime) -> datetime:
    if dt.tzinfo is None:
        return dt.replace(tzinfo=UTC)
    return dt.astimezone(UTC)


def get_client_ip(request: Request) -> str:
    """Extract client IP address safely."""
    if request.client and request.client.host:
        return request.client.host
    return "unknown"


def is_login_locked(db: Session, identifier: str, client_ip: str) -> bool:
    """Return True if either the account identifier or IP exceeded 5 failures in 15 minutes."""
    cutoff = datetime.now(UTC) - timedelta(minutes=LOCKOUT_MINUTES)
    keys = [
        _hash_rate_limit_key(f"acct:{identifier}"),
        _hash_rate_limit_key(f"ip:{client_ip}"),
    ]
    for key in keys:
        rows = db.scalars(
            select(LoginAttempt)
            .where(LoginAttempt.key == key)
            .order_by(LoginAttempt.attempted_at.desc(), LoginAttempt.id.desc())
            .limit(MAX_FAILED_ATTEMPTS)
        ).all()
        recent_failures = 0
        for row in rows:
            if _as_utc(row.attempted_at) < cutoff:
                break
            if row.success:
                break
            recent_failures += 1
        if recent_failures >= MAX_FAILED_ATTEMPTS:
            return True
    return False


def record_login_attempt(db: Session, identifier: str, client_ip: str, success: bool) -> None:
    """Persist a login attempt for both the account identifier and client IP."""
    now = datetime.now(UTC)
    for prefix, value in (("acct", identifier), ("ip", client_ip)):
        db.add(
            LoginAttempt(
                key=_hash_rate_limit_key(f"{prefix}:{value}"),
                attempted_at=now,
                success=success,
            )
        )
    db.commit()


class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    """Attach strict CSP and security headers to every HTTP response."""

    CSP_POLICY = (
        "default-src 'self'; "
        "style-src 'self' https://fonts.googleapis.com; "
        "font-src https://fonts.gstatic.com; "
        "img-src 'self' data:; "
        "form-action 'self'; "
        "frame-ancestors 'none'; "
        "base-uri 'self'"
    )

    async def dispatch(self, request: Request, call_next) -> Response:
        response = await call_next(request)
        response.headers["Content-Security-Policy"] = self.CSP_POLICY
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["Referrer-Policy"] = "same-origin"
        return response
