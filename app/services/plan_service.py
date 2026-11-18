"""Database-backed plan creation, versioning, and lookup helpers."""

from __future__ import annotations

from datetime import date

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.config import today_lagos
from app.engine.normalize import DEFAULT_WANTS_WEIGHTS
from app.engine.planner import (
    CostInput,
    GoalInput,
    IncomeInput,
    PlanInput,
    PlanOutput,
    compute_plan,
)
from app.models import FixedCost, Goal, IncomeSource, Plan, PlanItem, Profile


def build_plan_input_for_user(
    db: Session,
    user_id: int,
    as_of_date: date | None = None,
) -> PlanInput:
    """Load a user's profile, income, costs, and goals into an engine PlanInput."""
    profile = db.scalar(select(Profile).where(Profile.user_id == user_id))
    incomes = db.scalars(select(IncomeSource).where(IncomeSource.user_id == user_id)).all()
    costs = db.scalars(select(FixedCost).where(FixedCost.user_id == user_id)).all()
    goals = db.scalars(select(Goal).where(Goal.user_id == user_id)).all()

    return PlanInput(
        income_sources=[
            IncomeInput(
                label=inc.label,
                amount_kobo=inc.amount_kobo,
                frequency=inc.frequency,
                is_primary=inc.is_primary,
            )
            for inc in incomes
        ],
        fixed_costs=[
            CostInput(
                category=c.category,
                label=c.label,
                amount_kobo=c.amount_kobo,
                frequency=c.frequency,
                due_month=c.due_month,
                is_need=c.is_need,
            )
            for c in costs
        ],
        goals=[
            GoalInput(
                id=g.id,
                name=g.name,
                target_kobo=g.target_kobo,
                saved_kobo=g.saved_kobo,
                deadline=g.deadline,
            )
            for g in goals
        ],
        emergency_months=profile.emergency_months if profile else 3,
        emergency_savings_kobo=profile.emergency_savings_kobo if profile else 0,
        festive_fund_enabled=profile.festive_fund_enabled if profile else True,
        wants_weights=(
            dict(profile.wants_weights)
            if profile and profile.wants_weights
            else dict(DEFAULT_WANTS_WEIGHTS)
        ),
        as_of_date=as_of_date or today_lagos(),
        mode=profile.mode if profile else "planner",
        savings_rate_pct=profile.savings_rate_pct if profile else 10,
    )


def serialize_plan_summary(output: PlanOutput) -> dict:
    """Serialize PlanOutput metadata to JSON-safe primitives for Plan.summary."""
    return {
        "status_message": output.status_message,
        "savings_total_kobo": output.savings_total_kobo,
        "wants_total_kobo": output.wants_total_kobo,
        "buffer_kobo": output.buffer_kobo,
        "emergency_target_kobo": output.emergency_target_kobo,
        "emergency_contribution_kobo": output.emergency_contribution_kobo,
        "festive_contribution_kobo": output.festive_contribution_kobo,
        "deficit_kobo": output.deficit_kobo,
        "breakeven_income_kobo": output.breakeven_income_kobo,
        "monthly_variable_pool_kobo": output.monthly_variable_pool_kobo,
        "suggestions": list(output.suggestions),
        "category_allowances_kobo": dict(output.category_allowances_kobo),
        "goal_results": [
            {
                "goal_id": g.goal_id,
                "name": g.name,
                "target_kobo": g.target_kobo,
                "saved_kobo": g.saved_kobo,
                "deadline": g.deadline.isoformat(),
                "monthly_needed_kobo": g.monthly_needed_kobo,
                "allocated_kobo": g.allocated_kobo,
                "on_track": g.on_track,
                "estimated_completion": (
                    g.estimated_completion.isoformat() if g.estimated_completion else None
                ),
            }
            for g in output.goal_results
        ],
    }


def create_plan_version(
    db: Session,
    user_id: int,
    effective_from: date | None = None,
) -> Plan:
    """Recompute the plan and insert a brand-new versioned Plan row."""
    eff_date = effective_from or today_lagos()
    plan_input = build_plan_input_for_user(db, user_id, as_of_date=eff_date)
    output = compute_plan(plan_input)

    plan = Plan(
        user_id=user_id,
        effective_from=eff_date,
        status=output.status,
        income_monthly_kobo=output.income_monthly_kobo,
        needs_total_kobo=output.needs_total_kobo,
        summary=serialize_plan_summary(output),
    )
    db.add(plan)
    db.flush()

    for item in output.items:
        db.add(
            PlanItem(
                plan_id=plan.id,
                category=item.category,
                group=item.group,
                amount_kobo=item.amount_kobo,
                note=item.note,
            )
        )

    db.commit()
    db.refresh(plan)
    return plan


def get_latest_plan(db: Session, user_id: int) -> Plan | None:
    """Return the most recent plan version for a user."""
    return db.scalar(
        select(Plan)
        .where(Plan.user_id == user_id)
        .order_by(Plan.effective_from.desc(), Plan.id.desc())
        .limit(1)
    )


def get_plan_in_force_for_date(db: Session, user_id: int, target_date: date) -> Plan | None:
    """Return the plan version active on `target_date` (or earliest plan as fallback)."""
    plan = db.scalar(
        select(Plan)
        .where(Plan.user_id == user_id, Plan.effective_from <= target_date)
        .order_by(Plan.effective_from.desc(), Plan.id.desc())
        .limit(1)
    )
    if plan is not None:
        return plan
    return db.scalar(
        select(Plan)
        .where(Plan.user_id == user_id)
        .order_by(Plan.effective_from.asc(), Plan.id.asc())
        .limit(1)
    )
