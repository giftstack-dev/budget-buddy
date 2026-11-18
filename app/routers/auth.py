"""Registration, login, and logout routes with Argon2, CSRF, and rate limiting."""

from __future__ import annotations

import re

from fastapi import APIRouter, Depends, Form, Request
from fastapi.responses import HTMLResponse, RedirectResponse
from sqlalchemy import or_, select
from sqlalchemy.orm import Session

from app.config import now_lagos
from app.database import get_db
from app.deps import enforce_csrf, get_optional_user, template_context, templates
from app.models import Profile, User
from app.security import (
    get_client_ip,
    get_csrf_token,
    hash_password,
    is_login_locked,
    record_login_attempt,
    verify_password,
)

router = APIRouter()

_EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")
_PHONE_CLEAN_RE = re.compile(r"[^\d+]")


def _normalize_email(raw: str) -> str | None:
    cleaned = raw.strip().lower()
    return cleaned or None


def _normalize_phone(raw: str) -> str | None:
    cleaned = _PHONE_CLEAN_RE.sub("", raw.strip())
    return cleaned or None


def _regenerate_session(request: Request, user_id: int) -> None:
    request.session.clear()
    request.session["user_id"] = user_id
    get_csrf_token(request)


@router.get("/register", response_class=HTMLResponse)
def register_page(
    request: Request,
    user: User | None = Depends(get_optional_user),
):
    if user is not None:
        return RedirectResponse("/home", status_code=303)
    return templates.TemplateResponse(
        request,
        "pages/register.html",
        template_context(request, errors=[], form_data={}),
    )


@router.post("/register", response_class=HTMLResponse, dependencies=[Depends(enforce_csrf)])
def register_submit(
    request: Request,
    email: str = Form(""),
    phone: str = Form(""),
    display_name: str = Form(""),
    password: str = Form(""),
    confirm_password: str = Form(""),
    db: Session = Depends(get_db),
):
    norm_email = _normalize_email(email)
    norm_phone = _normalize_phone(phone)
    clean_name = display_name.strip()

    errors: list[str] = []
    if not norm_email and not norm_phone:
        errors.append("Please enter an email address or a phone number.")
    if norm_email and not _EMAIL_RE.match(norm_email):
        errors.append("Please enter a valid email address.")
    if norm_phone and (len(re.sub(r"\D", "", norm_phone)) < 7 or len(norm_phone) > 20):
        errors.append("Please enter a valid phone number (for example 08031234567).")
    if not clean_name:
        errors.append("Please enter your first name or a display name.")
    elif len(clean_name) > 100:
        errors.append("Display name must be 100 characters or fewer.")
    if len(password) < 8:
        errors.append("Password must be at least 8 characters long.")
    if password != confirm_password:
        errors.append("Passwords do not match.")

    if not errors:
        if norm_email and db.scalar(select(User).where(User.email == norm_email)):
            errors.append("An account with that email already exists. Try logging in instead.")
        if norm_phone and db.scalar(select(User).where(User.phone == norm_phone)):
            errors.append("An account with that phone number already exists. Try logging in instead.")

    if errors:
        return templates.TemplateResponse(
            request,
            "pages/register.html",
            template_context(
                request,
                errors=errors,
                form_data={"email": email, "phone": phone, "display_name": display_name},
            ),
            status_code=400,
        )

    new_user = User(
        email=norm_email,
        phone=norm_phone,
        password_hash=hash_password(password),
        last_login_at=now_lagos(),
    )
    db.add(new_user)
    db.flush()

    profile = Profile(
        user_id=new_user.id,
        display_name=clean_name,
        onboarding_step=1,
        onboarding_done=False,
    )
    db.add(profile)
    db.commit()

    _regenerate_session(request, new_user.id)
    return RedirectResponse("/onboarding", status_code=303)


@router.get("/login", response_class=HTMLResponse)
def login_page(
    request: Request,
    user: User | None = Depends(get_optional_user),
):
    if user is not None:
        return RedirectResponse("/home", status_code=303)
    return templates.TemplateResponse(
        request,
        "pages/login.html",
        template_context(request, error=None, identifier=""),
    )


@router.post("/login", response_class=HTMLResponse, dependencies=[Depends(enforce_csrf)])
def login_submit(
    request: Request,
    identifier: str = Form(""),
    password: str = Form(""),
    db: Session = Depends(get_db),
):
    raw_id = identifier.strip()
    client_ip = get_client_ip(request)
    norm_key = raw_id.lower() if "@" in raw_id else (_normalize_phone(raw_id) or raw_id.lower())

    if not raw_id or not password:
        return templates.TemplateResponse(
            request,
            "pages/login.html",
            template_context(
                request,
                error="Please enter both your email or phone number and your password.",
                identifier=identifier,
            ),
            status_code=400,
        )

    if is_login_locked(db, norm_key, client_ip):
        return templates.TemplateResponse(
            request,
            "pages/login.html",
            template_context(
                request,
                error="Too many sign-in attempts. Please wait 15 minutes and try again.",
                identifier=identifier,
            ),
            status_code=429,
        )

    matched_user: User | None = None
    if "@" in raw_id:
        matched_user = db.scalar(select(User).where(User.email == raw_id.lower()))
    else:
        phone_cand = _normalize_phone(raw_id)
        if phone_cand:
            matched_user = db.scalar(
                select(User).where(or_(User.phone == phone_cand, User.email == raw_id.lower()))
            )

    if matched_user is None or not verify_password(password, matched_user.password_hash):
        record_login_attempt(db, norm_key, client_ip, success=False)
        return templates.TemplateResponse(
            request,
            "pages/login.html",
            template_context(
                request,
                error="We could not sign you in with those details. Please check your email/phone and password.",
                identifier=identifier,
            ),
            status_code=400,
        )

    record_login_attempt(db, norm_key, client_ip, success=True)
    matched_user.last_login_at = now_lagos()
    db.commit()

    _regenerate_session(request, matched_user.id)
    profile = db.scalar(select(Profile).where(Profile.user_id == matched_user.id))
    if profile and profile.onboarding_done:
        return RedirectResponse("/home", status_code=303)
    return RedirectResponse("/onboarding", status_code=303)


@router.post("/logout", dependencies=[Depends(enforce_csrf)])
def logout(request: Request):
    request.session.clear()
    return RedirectResponse("/", status_code=303)
