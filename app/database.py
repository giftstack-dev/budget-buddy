"""Database engine and session management supporting both SQLite and PostgreSQL."""

from __future__ import annotations

from collections.abc import Generator

from sqlalchemy import create_engine, event
from sqlalchemy.engine import Engine
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker

from app.config import settings


class Base(DeclarativeBase):
    """Base class for all SQLAlchemy 2.0 ORM models."""


def create_app_engine(database_url: str) -> Engine:
    """Create a SQLAlchemy engine configured safely for SQLite or PostgreSQL."""
    is_sqlite = database_url.startswith("sqlite")
    connect_args = {"check_same_thread": False} if is_sqlite else {}
    engine = create_engine(
        database_url,
        connect_args=connect_args,
        pool_pre_ping=not is_sqlite,
    )

    if is_sqlite:
        # SQLite disables foreign-key cascades by default; enable them per connection.
        @event.listens_for(engine, "connect")
        def _enable_sqlite_foreign_keys(dbapi_connection, _connection_record) -> None:
            cursor = dbapi_connection.cursor()
            cursor.execute("PRAGMA foreign_keys=ON")
            cursor.close()

    return engine


engine = create_app_engine(settings.database_url)
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False, expire_on_commit=False)


def get_db() -> Generator[Session, None, None]:
    """Yield a request-scoped database session and close it cleanly afterwards."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
