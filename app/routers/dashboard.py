"""Authenticated Home dashboard route."""

from __future__ import annotations

from datetime import date

from fastapi import APIRouter, Depends, Request
from fastapi.responses import HTMLResponse
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.config import now_lagos, today_lagos
from app.database import get_db
from app.deps import require_onboarded_user, template_context, templates
from app.engine.normalize import VARIABLE_CATEGORIES, category_label, normalize_to_monthly_kobo
from app.engine.tips import get_weekly_tip
from app.engine.tracker import compute_tracker_state
from app.models import Expense, FixedCost, IncomeSource, Profile, Review, User
from app.money import format_naira
from app.services.plan_service import create_plan_version, get_latest_plan
from app.services.review_service import ensure_due_reviews

router = APIRouter()


def _greeting_for_hour(hour: int) -> str:
    if hour < 12:
        return "Good morning"
    if hour < 17:
        return "Good afternoon"
    return "Good evening"


def _upcoming_events(
    today: date,
    next_pay_date: date,
    costs: list[FixedCost],
) -> list[dict[str, str]]:
    events: list[dict[str, str]] = [
        {
            "title": "Next payday",
            "when": next_pay_date.strftime("%a, %d %b %Y"),
            "detail": "Your next pay cycle starts",
        }
    ]
    upcoming_months = {((today.month - 1 + offset) % 12) + 1 for offset in range(3)}
    for cost in costs:
        freq = cost.frequency.lower()
        if freq in {"yearly", "termly"}:
            anchor = cost.due_month or today.month
            due_set = (
                {anchor}
                if freq == "yearly"
                else {anchor, ((anchor - 1 + 4) % 12) + 1, ((anchor - 1 + 8) % 12) + 1}
            )
            matching = sorted(m for m in due_set if m in upcoming_months)
            if matching:
                month_name = date(today.year, matching[0], 1).strftime("%B")
                events.append(
                    {
                        "title": cost.label or category_label(cost.category),
                        "when": f"Due in {month_name}",
                        "detail": format_naira(cost.amount_kobo),
                    }
                )
    return events


@router.get("/home", response_class=HTMLResponse)
def dashboard_home(
    request: Request,
    saved: str | None = None,
    error: str | None = None,
    db: Session = Depends(get_db),
    user: User = Depends(require_onboarded_user),
):
    today = today_lagos()
    hour = now_lagos().hour
    profile = db.scalar(select(Profile).where(Profile.user_id == user.id))
    incomes = db.scalars(
        select(IncomeSource)
        .where(IncomeSource.user_id == user.id)
        .order_by(IncomeSource.is_primary.desc(), IncomeSource.id.asc())
    ).all()
    costs = db.scalars(select(FixedCost).where(FixedCost.user_id == user.id)).all()

    plan = get_latest_plan(db, user.id)
    if plan is None:
        plan = create_plan_version(db, user.id, effective_from=today)

    reviews = ensure_due_reviews(db, user.id, today=today)
    latest_review: Review | None = reviews[0] if reviews else None

    anchor_pay_date = incomes[0].next_pay_date if incomes else today
    pay_freq = incomes[0].frequency if incomes else "monthly"

    expenses = db.scalars(
        select(Expense)
        .where(Expense.user_id == user.id)
        .order_by(Expense.spent_on.desc(), Expense.id.desc())
    ).all()
    expense_tuples = [(e.spent_on, e.amount_kobo, e.category) for e in expenses]
    today_entries = [e for e in expenses if e.spent_on == today]

    summary = plan.summary or {}
    monthly_var_pool = int(summary.get("monthly_variable_pool_kobo", 0))
    fixed_monthly = sum(normalize_to_monthly_kobo(c.amount_kobo, c.frequency) for c in costs)

    tracker = compute_tracker_state(
        today=today,
        anchor_pay_date=anchor_pay_date,
        pay_frequency=pay_freq,
        mode=profile.mode if profile else "planner",
        monthly_variable_pool_kobo=monthly_var_pool,
        expenses=expense_tuples,
        income_monthly_kobo=plan.income_monthly_kobo,
        fixed_costs_monthly_kobo=fixed_monthly,
        savings_rate_pct=profile.savings_rate_pct if profile else 10,
    )

    if profile and profile.mode == "log_only":
        cycle_status_title = "Tracking mode active"
        cycle_status_sentence = (
            f"You have {format_naira(tracker.remaining_pool_kobo)} left to spend "
            f"across the remaining {tracker.days_left_including_today} day(s) of this cycle."
        )
        cycle_status_tone = "balanced"
    elif plan.status == "DEFICIT":
        cycle_status_title = "Needs exceed income"
        cycle_status_sentence = summary.get(
            "status_message",
            "Your essential costs are higher than your monthly income right now.",
        )
        cycle_status_tone = "deficit"
    elif plan.status == "TIGHT":
        cycle_status_title = "Tight but covered"
        cycle_status_sentence = summary.get(
            "status_message",
            "Your essentials are covered, though day-to-day flexibility is tight.",
        )
        cycle_status_tone = "tight"
    else:
        cycle_status_title = "On steady ground"
        cycle_status_sentence = summary.get(
            "status_message",
            "Your essentials, savings, and spending allowance are balanced.",
        )
        cycle_status_tone = "balanced"

    days_elapsed_pct = (
        min(100, (tracker.cycle.day_number * 100) // max(1, tracker.cycle.length_days))
    )
    safe_ratio_pct = (
        min(100, (tracker.safe_to_spend_today_kobo * 100) // max(1, tracker.daily_allowance_kobo))
        if tracker.daily_allowance_kobo > 0
        else 0
    )
    remaining_pct = max(0, 100 - tracker.spent_percent)

    return templates.TemplateResponse(
        request,
        "pages/home.html",
        template_context(
            request,
            user=user,
            active_nav="home",
            greeting=_greeting_for_hour(hour),
            profile=profile,
            plan=plan,
            tracker=tracker,
            cycle_status_title=cycle_status_title,
            cycle_status_sentence=cycle_status_sentence,
            cycle_status_tone=cycle_status_tone,
            days_elapsed_pct=days_elapsed_pct,
            safe_ratio_pct=safe_ratio_pct,
            remaining_pct=remaining_pct,
            variable_categories=VARIABLE_CATEGORIES,
            today_entries=today_entries,
            upcoming=_upcoming_events(today, tracker.cycle.next_pay_date, costs),
            tip=get_weekly_tip(today),
            latest_review=latest_review,
            saved_notice=saved,
            error_notice=error,
        ),
    )
