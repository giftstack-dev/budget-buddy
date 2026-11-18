"""Application configuration and Lagos timezone helpers."""

from __future__ import annotations

import os
from dataclasses import dataclass
from datetime import date, datetime
from zoneinfo import ZoneInfo

from dotenv import load_dotenv

load_dotenv()

LAGOS_TZ = ZoneInfo("Africa/Lagos")

DEFAULT_SECRET_KEY = "change-me-to-a-long-random-secret-key"


def today_lagos() -> date:
    """Return today's calendar date in Africa/Lagos so late-night entries match the right day."""
    return datetime.now(LAGOS_TZ).date()


def now_lagos() -> datetime:
    """Return the current timezone-aware datetime in Africa/Lagos."""
    return datetime.now(LAGOS_TZ)


def _parse_bool(raw: str | None, default: bool = False) -> bool:
    if raw is None:
        return default
    return raw.strip().lower() in {"1", "true", "yes", "on"}


@dataclass(frozen=True)
class Settings:
    """Runtime settings loaded from environment variables."""

    database_url: str
    secret_key: str
    cookie_secure: bool
    demo_enabled: bool
    app_env: str


def load_settings() -> Settings:
    """Load and validate configuration, refusing to boot in production with unsafe defaults."""
    app_env = os.getenv("APP_ENV", "development").strip().lower() or "development"
    database_url = os.getenv("DATABASE_URL", "sqlite:///./budget.db").strip()
    secret_key = os.getenv("SECRET_KEY", "").strip()
    cookie_secure = _parse_bool(os.getenv("COOKIE_SECURE"), default=False)
    demo_enabled = _parse_bool(os.getenv("DEMO_ENABLED"), default=True)

    if app_env == "production":
        if not secret_key or secret_key == DEFAULT_SECRET_KEY or len(secret_key) < 16:
            raise RuntimeError(
                "SECRET_KEY must be set to a strong, non-default secret when APP_ENV=production."
            )
    elif not secret_key:
        secret_key = DEFAULT_SECRET_KEY

    return Settings(
        database_url=database_url,
        secret_key=secret_key,
        cookie_secure=cookie_secure,
        demo_enabled=demo_enabled,
        app_env=app_env,
    )


settings = load_settings()
