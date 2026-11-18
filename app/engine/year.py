"""12-month forward projection with sinking funds, emergency progress, and goal dates."""

from __future__ import annotations

from dataclasses import dataclass
from datetime import date

from app.engine.normalize import category_label, normalize_to_monthly_kobo
from app.engine.periods import add_months
from app.engine.planner import CostInput, PlanInput, PlanOutput
from app.money import format_naira


@dataclass(frozen=True)
class YearMonthRow:
    """One row of the 12-month projection table."""

    month_index: int
    month_date: date
    month_label: str
    income_kobo: int
    needs_kobo: int
    savings_kobo: int
    wants_kobo: int
    buffer_kobo: int
    emergency_balance_kobo: int
    emergency_target_kobo: int
    emergency_pct: int
    sinking_fund_balance_kobo: int
    due_markers: list[str]
    goal_milestones: list[str]


def _is_cost_due_in_month(cost: CostInput, month_num: int, first_cycle_month: int) -> bool:
    freq = cost.frequency.strip().lower()
    anchor_month = cost.due_month if cost.due_month and 1 <= cost.due_month <= 12 else first_cycle_month
    if freq == "yearly":
        return month_num == anchor_month
    if freq == "termly":
        due_months = {
            anchor_month,
            ((anchor_month - 1 + 4) % 12) + 1,
            ((anchor_month - 1 + 8) % 12) + 1,
        }
        return month_num in due_months
    return False


def build_year_view(
    plan_input: PlanInput,
    plan_output: PlanOutput,
    start_date: date,
) -> list[YearMonthRow]:
    """Project 12 calendar months starting at `start_date`."""
    rows: list[YearMonthRow] = []
    first_cycle_month = start_date.month

    sinking_costs = [
        c
        for c in plan_input.fixed_costs
        if c.is_need and c.frequency.strip().lower() in {"yearly", "termly"}
    ]
    monthly_sinking_inflow = sum(
        normalize_to_monthly_kobo(c.amount_kobo, c.frequency) for c in sinking_costs
    )

    emergency_balance = max(0, plan_input.emergency_savings_kobo)
    emergency_target = plan_output.emergency_target_kobo
    sinking_balance = 0

    for idx in range(12):
        month_date = add_months(date(start_date.year, start_date.month, 1), idx)
        month_num = month_date.month

        if emergency_target > 0:
            emergency_balance = min(
                emergency_target,
                emergency_balance + plan_output.emergency_contribution_kobo,
            )
            emergency_pct = min(100, (emergency_balance * 100) // emergency_target)
        else:
            emergency_pct = 100

        sinking_balance += monthly_sinking_inflow
        due_markers: list[str] = []
        for cost in sinking_costs:
            if _is_cost_due_in_month(cost, month_num, first_cycle_month):
                label = cost.label or category_label(cost.category)
                due_markers.append(f"{label} due ({format_naira(cost.amount_kobo)})")
                sinking_balance = max(0, sinking_balance - cost.amount_kobo)

        goal_milestones: list[str] = []
        for g in plan_output.goal_results:
            if (
                g.estimated_completion
                and g.estimated_completion.year == month_date.year
                and g.estimated_completion.month == month_date.month
            ):
                goal_milestones.append(f"Goal ready: {g.name}")

        rows.append(
            YearMonthRow(
                month_index=idx + 1,
                month_date=month_date,
                month_label=month_date.strftime("%b %Y"),
                income_kobo=plan_output.income_monthly_kobo,
                needs_kobo=plan_output.needs_total_kobo,
                savings_kobo=plan_output.savings_total_kobo,
                wants_kobo=plan_output.wants_total_kobo,
                buffer_kobo=plan_output.buffer_kobo,
                emergency_balance_kobo=emergency_balance,
                emergency_target_kobo=emergency_target,
                emergency_pct=emergency_pct,
                sinking_fund_balance_kobo=sinking_balance,
                due_markers=due_markers,
                goal_milestones=goal_milestones,
            )
        )

    return rows
