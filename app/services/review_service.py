"""Idempotent weekly and monthly review generation tied to active plan versions."""

from __future__ import annotations

from datetime import date

from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.config import today_lagos
from app.engine.normalize import normalize_to_monthly_kobo
from app.engine.periods import PayCycle, get_cycle_for_date, split_cycle_into_blocks
from app.engine.review import compute_monthly_review, compute_weekly_review
from app.engine.tracker import compute_cycle_pool_kobo
from app.models import Expense, FixedCost, IncomeSource, Plan, Profile, Review, User
from app.services.plan_service import create_plan_version, get_plan_in_force_for_date


def _scale_to_block(cycle_amount: int, block_days: int, cycle_days: int) -> int:
    if cycle_days <= 0:
        return 0
    return (cycle_amount * block_days + cycle_days // 2) // cycle_days


def _get_cycle_pool_and_cats(
    db: Session,
    user_id: int,
    plan: Plan,
    profile: Profile | None,
    pay_frequency: str,
) -> tuple[int, dict[str, int]]:
    mode = profile.mode if profile else "planner"
    savings_rate_pct = profile.savings_rate_pct if profile else 10
    summary = plan.summary or {}
    monthly_var_pool = int(summary.get("monthly_variable_pool_kobo", 0))
    cat_allowances_monthly: dict[str, int] = {
        str(k): int(v) for k, v in (summary.get("category_allowances_kobo") or {}).items()
    }

    if mode == "log_only":
        costs = db.scalars(select(FixedCost).where(FixedCost.user_id == user_id)).all()
        fixed_monthly = sum(
            normalize_to_monthly_kobo(c.amount_kobo, c.frequency) for c in costs
        )
        cycle_pool = compute_cycle_pool_kobo(
            mode="log_only",
            pay_frequency=pay_frequency,
            monthly_variable_pool_kobo=0,
            income_monthly_kobo=plan.income_monthly_kobo,
            fixed_costs_monthly_kobo=fixed_monthly,
            savings_rate_pct=savings_rate_pct,
        )
        return cycle_pool, {}

    cycle_pool = compute_cycle_pool_kobo(
        mode="planner",
        pay_frequency=pay_frequency,
        monthly_variable_pool_kobo=monthly_var_pool,
    )
    cat_allowances_cycle = {
        cat: compute_cycle_pool_kobo("planner", pay_frequency, amt)
        for cat, amt in cat_allowances_monthly.items()
    }
    return cycle_pool, cat_allowances_cycle


def ensure_due_reviews(db: Session, user_id: int, today: date | None = None) -> list[Review]:
    """Generate any completed weekly or monthly reviews not yet persisted (idempotent)."""
    ref_today = today or today_lagos()
    user = db.get(User, user_id)
    if user is None:
        return []

    profile = db.scalar(select(Profile).where(Profile.user_id == user_id))
    incomes = db.scalars(
        select(IncomeSource)
        .where(IncomeSource.user_id == user_id)
        .order_by(IncomeSource.is_primary.desc(), IncomeSource.id.asc())
    ).all()
    if not incomes:
        return db.scalars(
            select(Review)
            .where(Review.user_id == user_id)
            .order_by(Review.period_end.desc(), Review.id.desc())
        ).all()

    primary = incomes[0]
    anchor_pay_date = primary.next_pay_date
    pay_frequency = primary.frequency

    earliest_expense = db.scalar(
        select(Expense.spent_on)
        .where(Expense.user_id == user_id)
        .order_by(Expense.spent_on.asc())
        .limit(1)
    )
    earliest_plan = db.scalar(
        select(Plan.effective_from)
        .where(Plan.user_id == user_id)
        .order_by(Plan.effective_from.asc())
        .limit(1)
    )
    candidates = [d for d in (earliest_expense, earliest_plan) if d is not None]
    if not candidates:
        candidates = [ref_today]
    start_anchor = min(candidates)

    # Walk cycles from start_anchor's cycle through the cycle containing ref_today.
    cycles: list[PayCycle] = []
    cursor_date = start_anchor
    while True:
        cyc = get_cycle_for_date(cursor_date, anchor_pay_date, pay_frequency)
        cycles.append(cyc)
        if cyc.end >= ref_today or len(cycles) >= 36:
            break
        cursor_date = cyc.next_pay_date

    all_expenses = db.scalars(
        select(Expense)
        .where(Expense.user_id == user_id)
        .order_by(Expense.spent_on.asc(), Expense.id.asc())
    ).all()
    expense_tuples = [(e.spent_on, e.amount_kobo, e.category) for e in all_expenses]

    mode = profile.mode if profile else "planner"

    existing_reviews = db.scalars(
        select(Review)
        .where(Review.user_id == user_id)
        .order_by(Review.period_start.asc(), Review.id.asc())
    ).all()
    existing_keys = {(r.kind, r.period_start) for r in existing_reviews}
    prior_weekly_ratios = [
        r.ratio_bp for r in existing_reviews if r.kind == "weekly" and r.status != "low_data"
    ]

    for cyc in cycles:
        blocks = split_cycle_into_blocks(cyc)
        cycle_weekly_statuses: list[str] = []

        for block in blocks:
            if block.end >= ref_today:
                continue

            if ("weekly", block.start) in existing_keys:
                existing = next(
                    r for r in existing_reviews if r.kind == "weekly" and r.period_start == block.start
                )
                cycle_weekly_statuses.append(existing.status)
                continue

            plan = get_plan_in_force_for_date(db, user_id, block.end)
            if plan is None:
                plan = create_plan_version(db, user_id, effective_from=block.start)

            cycle_pool, cat_allowances_cycle = _get_cycle_pool_and_cats(
                db, user_id, plan, profile, pay_frequency
            )
            daily_allowance = (cycle_pool + cyc.length_days // 2) // cyc.length_days
            block_allowance = _scale_to_block(cycle_pool, block.length_days, cyc.length_days)
            block_cat_allowances = {
                cat: _scale_to_block(amt, block.length_days, cyc.length_days)
                for cat, amt in cat_allowances_cycle.items()
            }

            result = compute_weekly_review(
                block=block,
                allowance_kobo=block_allowance,
                daily_allowance_kobo=daily_allowance,
                expenses=expense_tuples,
                mode=mode,
                category_allowances_block=block_cat_allowances,
                prior_week_ratios_bp=prior_weekly_ratios,
            )

            review = Review(
                user_id=user_id,
                plan_id=plan.id,
                kind="weekly",
                period_start=result.period_start,
                period_end=result.period_end,
                spent_kobo=result.spent_kobo,
                allowance_kobo=result.allowance_kobo,
                ratio_bp=result.ratio_bp,
                status=result.status,
                message=result.message,
                details={
                    "top_category": result.top_category,
                    "days_logged": result.days_logged,
                    "days_under_allowance": result.days_under_allowance,
                    "streak_days": result.streak_days,
                    "trend": result.trend,
                    "category_totals_kobo": result.category_totals_kobo,
                },
            )
            try:
                db.add(review)
                db.commit()
                existing_keys.add(("weekly", block.start))
                cycle_weekly_statuses.append(result.status)
                if result.status != "low_data":
                    prior_weekly_ratios.append(result.ratio_bp)
            except IntegrityError:
                db.rollback()

        if cyc.end < ref_today and ("monthly", cyc.start) not in existing_keys:
            plan = get_plan_in_force_for_date(db, user_id, cyc.end)
            if plan is None:
                plan = create_plan_version(db, user_id, effective_from=cyc.start)

            cycle_pool, cat_allowances_cycle = _get_cycle_pool_and_cats(
                db, user_id, plan, profile, pay_frequency
            )
            m_result = compute_monthly_review(
                cycle=cyc,
                cycle_allowance_kobo=cycle_pool,
                expenses=expense_tuples,
                category_allowances_cycle=cat_allowances_cycle,
                weekly_statuses=cycle_weekly_statuses,
                mode=mode,
            )
            m_review = Review(
                user_id=user_id,
                plan_id=plan.id,
                kind="monthly",
                period_start=m_result.period_start,
                period_end=m_result.period_end,
                spent_kobo=m_result.spent_kobo,
                allowance_kobo=m_result.allowance_kobo,
                ratio_bp=m_result.ratio_bp,
                status=m_result.status,
                message=m_result.message,
                details={
                    "leftover_kobo": m_result.leftover_kobo,
                    "weeks_on_track": m_result.weeks_on_track,
                    "total_weeks": m_result.total_weeks,
                    "comparisons": [
                        {
                            "category": c.category,
                            "label": c.label,
                            "planned_kobo": c.planned_kobo,
                            "actual_kobo": c.actual_kobo,
                            "diff_kobo": c.diff_kobo,
                        }
                        for c in m_result.comparisons
                    ],
                },
            )
            try:
                db.add(m_review)
                db.commit()
                existing_keys.add(("monthly", cyc.start))
            except IntegrityError:
                db.rollback()

    return db.scalars(
        select(Review)
        .where(Review.user_id == user_id)
        .order_by(Review.period_end.desc(), Review.kind.asc(), Review.id.desc())
    ).all()
