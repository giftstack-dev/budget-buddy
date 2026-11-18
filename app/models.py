"""SQLAlchemy 2.0 data models for Budget Buddy."""

from __future__ import annotations

from datetime import date, datetime
from typing import Any

from sqlalchemy import (
    JSON,
    BigInteger,
    Boolean,
    Date,
    DateTime,
    ForeignKey,
    Index,
    Integer,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.config import now_lagos
from app.database import Base


class User(Base):
    """Registered or temporary demo account."""

    __tablename__ = "users"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    email: Mapped[str | None] = mapped_column(String(255), unique=True, nullable=True)
    phone: Mapped[str | None] = mapped_column(String(32), unique=True, nullable=True)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=now_lagos, nullable=False
    )
    last_login_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    is_demo: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    demo_expires_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )

    profile: Mapped[Profile | None] = relationship(
        back_populates="user", uselist=False, cascade="all, delete-orphan"
    )
    income_sources: Mapped[list[IncomeSource]] = relationship(
        back_populates="user", cascade="all, delete-orphan"
    )
    fixed_costs: Mapped[list[FixedCost]] = relationship(
        back_populates="user", cascade="all, delete-orphan"
    )
    goals: Mapped[list[Goal]] = relationship(
        back_populates="user", cascade="all, delete-orphan"
    )
    plans: Mapped[list[Plan]] = relationship(
        back_populates="user", cascade="all, delete-orphan"
    )
    expenses: Mapped[list[Expense]] = relationship(
        back_populates="user", cascade="all, delete-orphan"
    )
    reviews: Mapped[list[Review]] = relationship(
        back_populates="user", cascade="all, delete-orphan"
    )


class Profile(Base):
    """Household context, planning preferences, and onboarding state."""

    __tablename__ = "profiles"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False
    )
    display_name: Mapped[str] = mapped_column(String(100), nullable=False)
    city: Mapped[str] = mapped_column(String(100), default="", nullable=False)
    household_type: Mapped[str] = mapped_column(String(32), default="alone", nullable=False)
    dependents_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    housing_type: Mapped[str] = mapped_column(String(32), default="rent", nullable=False)
    employment_type: Mapped[str] = mapped_column(String(32), default="salary", nullable=False)
    mode: Mapped[str] = mapped_column(String(20), default="planner", nullable=False)
    emergency_months: Mapped[int] = mapped_column(Integer, default=3, nullable=False)
    emergency_savings_kobo: Mapped[int] = mapped_column(BigInteger, default=0, nullable=False)
    festive_fund_enabled: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    savings_rate_pct: Mapped[int] = mapped_column(Integer, default=10, nullable=False)
    wants_weights: Mapped[dict[str, int]] = mapped_column(
        JSON,
        default=lambda: {
            "eating_out": 30,
            "entertainment": 20,
            "personal_care": 20,
            "clothing_shopping": 20,
            "gifts": 10,
        },
        nullable=False,
    )
    onboarding_step: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    onboarding_done: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    user: Mapped[User] = relationship(back_populates="profile")


class IncomeSource(Base):
    """Regular salary, wages, allowance, or side income."""

    __tablename__ = "income_sources"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    label: Mapped[str] = mapped_column(String(120), nullable=False)
    amount_kobo: Mapped[int] = mapped_column(BigInteger, nullable=False)
    frequency: Mapped[str] = mapped_column(String(20), default="monthly", nullable=False)
    next_pay_date: Mapped[date] = mapped_column(Date, nullable=False)
    is_primary: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    user: Mapped[User] = relationship(back_populates="income_sources")


class FixedCost(Base):
    """Recurring living costs normalized to monthly amounts."""

    __tablename__ = "fixed_costs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    category: Mapped[str] = mapped_column(String(50), nullable=False)
    label: Mapped[str] = mapped_column(String(120), nullable=False)
    amount_kobo: Mapped[int] = mapped_column(BigInteger, nullable=False)
    frequency: Mapped[str] = mapped_column(String(20), default="monthly", nullable=False)
    due_month: Mapped[int | None] = mapped_column(Integer, nullable=True)
    is_need: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    user: Mapped[User] = relationship(back_populates="fixed_costs")


class Goal(Base):
    """User savings target with an optional saved amount and deadline."""

    __tablename__ = "goals"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    name: Mapped[str] = mapped_column(String(120), nullable=False)
    target_kobo: Mapped[int] = mapped_column(BigInteger, nullable=False)
    saved_kobo: Mapped[int] = mapped_column(BigInteger, default=0, nullable=False)
    deadline: Mapped[date] = mapped_column(Date, nullable=False)

    user: Mapped[User] = relationship(back_populates="goals")


class Plan(Base):
    """Immutable snapshot of a monthly plan version so past reviews keep their baseline."""

    __tablename__ = "plans"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=now_lagos, nullable=False
    )
    effective_from: Mapped[date] = mapped_column(Date, nullable=False)
    status: Mapped[str] = mapped_column(String(20), nullable=False)
    income_monthly_kobo: Mapped[int] = mapped_column(BigInteger, nullable=False)
    needs_total_kobo: Mapped[int] = mapped_column(BigInteger, nullable=False)
    summary: Mapped[dict[str, Any]] = mapped_column(JSON, default=dict, nullable=False)

    user: Mapped[User] = relationship(back_populates="plans")
    items: Mapped[list[PlanItem]] = relationship(
        back_populates="plan", cascade="all, delete-orphan"
    )
    reviews: Mapped[list[Review]] = relationship(back_populates="plan")


class PlanItem(Base):
    """Individual line item inside a monthly plan version."""

    __tablename__ = "plan_items"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    plan_id: Mapped[int] = mapped_column(
        ForeignKey("plans.id", ondelete="CASCADE"), nullable=False
    )
    category: Mapped[str] = mapped_column(String(50), nullable=False)
    group: Mapped[str] = mapped_column(String(20), nullable=False)
    amount_kobo: Mapped[int] = mapped_column(BigInteger, nullable=False)
    note: Mapped[str] = mapped_column(String(255), default="", nullable=False)

    plan: Mapped[Plan] = relationship(back_populates="items")


class Expense(Base):
    """Daily spending log stored with plain calendar dates (never timestamps for spent_on)."""

    __tablename__ = "expenses"
    __table_args__ = (Index("ix_expenses_user_spent_on", "user_id", "spent_on"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    spent_on: Mapped[date] = mapped_column(Date, nullable=False)
    amount_kobo: Mapped[int] = mapped_column(BigInteger, nullable=False)
    category: Mapped[str] = mapped_column(String(50), nullable=False)
    note: Mapped[str] = mapped_column(String(255), default="", nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=now_lagos, nullable=False
    )

    user: Mapped[User] = relationship(back_populates="expenses")


class Review(Base):
    """Saved weekly or monthly feedback tied to the plan version active in that period."""

    __tablename__ = "reviews"
    __table_args__ = (
        UniqueConstraint("user_id", "kind", "period_start", name="uq_reviews_user_kind_period_start"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    plan_id: Mapped[int] = mapped_column(
        ForeignKey("plans.id", ondelete="CASCADE"), nullable=False
    )
    kind: Mapped[str] = mapped_column(String(20), nullable=False)
    period_start: Mapped[date] = mapped_column(Date, nullable=False)
    period_end: Mapped[date] = mapped_column(Date, nullable=False)
    spent_kobo: Mapped[int] = mapped_column(BigInteger, nullable=False)
    allowance_kobo: Mapped[int] = mapped_column(BigInteger, nullable=False)
    ratio_bp: Mapped[int] = mapped_column(Integer, nullable=False)
    status: Mapped[str] = mapped_column(String(20), nullable=False)
    message: Mapped[str] = mapped_column(Text, nullable=False)
    details: Mapped[dict[str, Any]] = mapped_column(JSON, default=dict, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=now_lagos, nullable=False
    )

    user: Mapped[User] = relationship(back_populates="reviews")
    plan: Mapped[Plan] = relationship(back_populates="reviews")


class LoginAttempt(Base):
    """Tracks failed and successful logins to enforce brute-force lockouts."""

    __tablename__ = "login_attempts"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    key: Mapped[str] = mapped_column(String(255), index=True, nullable=False)
    attempted_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=now_lagos, nullable=False
    )
    success: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
