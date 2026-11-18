"""Demo account provisioning and expired demo account cleanup."""

from __future__ import annotations

import secrets
from datetime import date, timedelta

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.config import now_lagos, today_lagos
from app.engine.normalize import DEFAULT_WANTS_WEIGHTS
from app.engine.periods import add_months
from app.models import Expense, FixedCost, Goal, IncomeSource, Profile, User
from app.security import hash_password
from app.services.plan_service import create_plan_version
from app.services.review_service import ensure_due_reviews


def cleanup_expired_demo_users(db: Session) -> int:
    """Delete any temporary demo accounts whose 24-hour expiry has passed."""
    now = now_lagos()
    expired = db.scalars(
        select(User).where(User.is_demo.is_(True), User.demo_expires_at <= now)
    ).all()
    count = len(expired)
    for demo_user in expired:
        db.delete(demo_user)
    if count:
        db.commit()
    return count


def create_demo_user(db: Session, today: date | None = None) -> User:
    """Create a fresh realistic Nigerian demo user with 6 weeks of spending history."""
    cleanup_expired_demo_users(db)
    ref_today = today or today_lagos()
    now = now_lagos()

    token = secrets.token_hex(6)
    demo_user = User(
        email=f"demo-{token}@demo.budgetbuddy.local",
        phone=None,
        password_hash=hash_password(secrets.token_urlsafe(16)),
        is_demo=True,
        demo_expires_at=now + timedelta(hours=24),
        last_login_at=now,
    )
    db.add(demo_user)
    db.flush()

    profile = Profile(
        user_id=demo_user.id,
        display_name="Chidi",
        city="Asaba",
        household_type="alone",
        dependents_count=0,
        housing_type="rent",
        employment_type="salary",
        mode="planner",
        emergency_months=3,
        emergency_savings_kobo=120_000 * 100,
        festive_fund_enabled=True,
        savings_rate_pct=10,
        wants_weights=dict(DEFAULT_WANTS_WEIGHTS),
        onboarding_step=5,
        onboarding_done=True,
    )
    db.add(profile)

    # Payday on the 28th of the month.
    next_28 = date(ref_today.year, ref_today.month, 28)
    if next_28 <= ref_today:
        next_28 = add_months(next_28, 1, anchor_day=28)

    db.add(
        IncomeSource(
            user_id=demo_user.id,
            label="Monthly salary",
            amount_kobo=250_000 * 100,
            frequency="monthly",
            next_pay_date=next_28,
            is_primary=True,
        )
    )

    due_month = ((ref_today.month + 3 - 1) % 12) + 1
    costs = [
        ("rent", "Yearly apartment rent", 480_000 * 100, "yearly", due_month),
        ("food", "Monthly food & groceries", 60_000 * 100, "monthly", None),
        ("transport", "Daily commute & fuel", 25_000 * 100, "monthly", None),
        ("data_airtime", "Mobile data & airtime", 10_000 * 100, "monthly", None),
        ("utilities", "Electricity & cooking gas", 12_000 * 100, "monthly", None),
        ("family_support", "Support for parents", 15_000 * 100, "monthly", None),
    ]
    for category, label, amt, freq, d_month in costs:
        db.add(
            FixedCost(
                user_id=demo_user.id,
                category=category,
                label=label,
                amount_kobo=amt,
                frequency=freq,
                due_month=d_month,
                is_need=True,
            )
        )

    db.add(
        Goal(
            user_id=demo_user.id,
            name="Work laptop",
            target_kobo=350_000 * 100,
            saved_kobo=110_000 * 100,
            deadline=add_months(ref_today, 10),
        )
    )
    db.commit()

    start_date = ref_today - timedelta(days=45)
    create_plan_version(db, demo_user.id, effective_from=start_date)

    # Six weeks of realistic spending (weeks under, weeks over, and no-spend days).
    sample_entries: list[tuple[int, int, str, str]] = [
        (42, 3_500_00, "food", "Rice, tomatoes and pepper"),
        (41, 1_200_00, "transport", "Keke and bus to work"),
        (40, 2_500_00, "data_airtime", "Monthly data bundle"),
        (39, 0, "no_spend", "No spending today"),
        (38, 4_200_00, "eating_out", "Lunch with colleagues"),
        (37, 2_000_00, "food", "Bread, eggs and plantain"),
        (36, 1_500_00, "transport", "Shuttle fare"),
        (35, 14_000_00, "food", "Weekly market stock-up"),
        (34, 8_500_00, "clothing_shopping", "Work shirt"),
        (33, 6_500_00, "eating_out", "Weekend suya and drinks"),
        (32, 3_200_00, "transport", "Bolt ride in rain"),
        (31, 4_500_00, "entertainment", "Cinema outing"),
        (30, 2_800_00, "personal_care", "Haircut and toiletries"),
        (29, 0, "no_spend", "No spending today"),
        (28, 12_000_00, "food", "Garri, beans and palm oil"),
        (27, 2_200_00, "transport", "Daily commute"),
        (26, 1_800_00, "health", "Pharmacy pain relief"),
        (25, 3_000_00, "data_airtime", "Airtime and data top-up"),
        (24, 2_500_00, "eating_out", "Boli and fish"),
        (23, 0, "no_spend", "No spending today"),
        (22, 1_600_00, "household", "Detergent and soap"),
        (21, 9_500_00, "food", "Fresh fish and vegetables"),
        (20, 2_400_00, "transport", "Work bus fares"),
        (19, 3_800_00, "gifts", "Friend birthday contribution"),
        (18, 1_500_00, "food", "Fruits and water"),
        (17, 2_200_00, "eating_out", "Meat pie and drink"),
        (16, 1_400_00, "transport", "Keke errands"),
        (15, 0, "no_spend", "No spending today"),
        (14, 15_500_00, "food", "Two-week food restock"),
        (13, 3_500_00, "data_airtime", "Data renewal"),
        (12, 9_000_00, "entertainment", "Sunday hangout"),
        (11, 4_800_00, "transport", "Intercity bus"),
        (10, 5_500_00, "eating_out", "Dinner out"),
        (9, 2_000_00, "personal_care", "Body cream"),
        (8, 3_200_00, "food", "Yam and eggs"),
        (7, 4_000_00, "food", "Vegetables and chicken"),
        (6, 1_600_00, "transport", "Morning commute"),
        (5, 0, "no_spend", "No spending today"),
        (4, 2_800_00, "eating_out", "Jollof rice lunch"),
        (3, 1_900_00, "household", "Cooking spices"),
        (2, 1_500_00, "transport", "Keke back home"),
        (1, 3_000_00, "food", "Groceries top-up"),
    ]
    for days_ago, amt, cat, note in sample_entries:
        db.add(
            Expense(
                user_id=demo_user.id,
                spent_on=ref_today - timedelta(days=days_ago),
                amount_kobo=amt,
                category=cat,
                note=note,
            )
        )
    db.commit()

    ensure_due_reviews(db, demo_user.id, today=ref_today)
    return demo_user
