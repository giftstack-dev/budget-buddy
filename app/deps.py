"""Shared FastAPI dependencies, template renderer, and authorization helpers."""

from __future__ import annotations

from datetime import UTC, datetime
from pathlib import Path

from fastapi import Depends, HTTPException, Request
from fastapi.templating import Jinja2Templates
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.config import settings, today_lagos
from app.database import get_db
from app.engine.normalize import category_label
from app.models import Profile, User
from app.money import format_naira
from app.security import get_csrf_token, verify_csrf_token

TEMPLATES_DIR = Path(__file__).resolve().parent / "templates"
templates = Jinja2Templates(directory=str(TEMPLATES_DIR))
templates.env.autoescape = True
templates.env.filters["format_naira"] = format_naira
templates.env.filters["category_label"] = category_label


class RedirectTo(Exception):
    """Raised by dependencies to trigger a clean HTTP 303 redirect."""

    def __init__(self, url: str) -> None:
        self.url = url


def _is_expired_demo(user: User) -> bool:
    if not user.is_demo or user.demo_expires_at is None:
        return False
    exp = user.demo_expires_at
    if exp.tzinfo is None:
        exp = exp.replace(tzinfo=UTC)
    return exp <= datetime.now(UTC)


def get_optional_user(
    request: Request,
    db: Session = Depends(get_db),
) -> User | None:
    """Return the signed-in user or None if logged out or expired demo."""
    user_id = request.session.get("user_id")
    if not isinstance(user_id, int):
        return None
    user = db.get(User, user_id)
    if user is None or _is_expired_demo(user):
        request.session.clear()
        return None
    return user


def require_user(
    user: User | None = Depends(get_optional_user),
) -> User:
    """Require an authenticated user; redirect guests to /login."""
    if user is None:
        raise RedirectTo("/login")
    return user


def require_onboarded_user(
    db: Session = Depends(get_db),
    user: User = Depends(require_user),
) -> User:
    """Require an authenticated user who has finished onboarding."""
    profile = db.scalar(select(Profile).where(Profile.user_id == user.id))
    if profile is None or not profile.onboarding_done:
        raise RedirectTo("/onboarding")
    return user


async def enforce_csrf(request: Request) -> None:
    """Validate the hidden `csrf_token` field on POST requests."""
    form = await request.form()
    token = form.get("csrf_token")
    if not verify_csrf_token(request, token if isinstance(token, str) else None):
        raise HTTPException(
            status_code=403,
            detail="Your form session expired. Please go back, refresh, and try again.",
        )


def template_context(
    request: Request,
    user: User | None = None,
    active_nav: str = "",
    **extra,
) -> dict:
    """Build standard template context including CSRF token and public settings."""
    ctx = {
        "request": request,
        "user": user,
        "csrf_token": get_csrf_token(request),
        "demo_enabled": settings.demo_enabled,
        "today": today_lagos(),
        "active_nav": active_nav,
    }
    ctx.update(extra)
    return ctx
