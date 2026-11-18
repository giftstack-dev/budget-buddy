"""Daily safe-to-spend tracker calculations for the active pay cycle."""

from __future__ import annotations

from dataclasses import dataclass
from datetime import date

from app.engine.normalize import VARIABLE_CATEGORIES, scale_monthly_to_cycle_kobo
from app.engine.periods import PayCycle, get_cycle_for_date


@dataclass(frozen=True)
class TrackerState:
    """Live spending summary for the user's current pay cycle."""

    cycle: PayCycle
    cycle_pool_kobo: int
    daily_allowance_kobo: int
    spent_this_cycle_kobo: int
    remaining_pool_kobo: int
    days_left_including_today: int
    days_to_next_payday: int
    safe_to_spend_today_kobo: int
    spent_percent: int
    spent_width_step: int
    category_totals_kobo: dict[str, int]


def _width_step_5(pct: int) -> int:
    clamped = max(0, min(100, pct))
    return ((clamped + 2) // 5) * 5


def compute_cycle_pool_kobo(
    mode: str,
    pay_frequency: str,
    monthly_variable_pool_kobo: int,
    income_monthly_kobo: int = 0,
    fixed_costs_monthly_kobo: int = 0,
    savings_rate_pct: int = 10,
) -> int:
    """Return the total variable spending pool for one pay cycle."""
    if mode == "log_only":
        savings_target = (income_monthly_kobo * max(0, savings_rate_pct) + 50) // 100
        monthly_pool = max(0, income_monthly_kobo - fixed_costs_monthly_kobo - savings_target)
    else:
        monthly_pool = max(0, monthly_variable_pool_kobo)
    return scale_monthly_to_cycle_kobo(monthly_pool, pay_frequency)


def compute_tracker_state(
    today: date,
    anchor_pay_date: date,
    pay_frequency: str,
    mode: str,
    monthly_variable_pool_kobo: int,
    expenses: list[tuple[date, int, str]],
    income_monthly_kobo: int = 0,
    fixed_costs_monthly_kobo: int = 0,
    savings_rate_pct: int = 10,
) -> TrackerState:
    """Compute safe-to-spend today and cycle progress without ever going negative."""
    cycle = get_cycle_for_date(today, anchor_pay_date, pay_frequency)
    cycle_pool = compute_cycle_pool_kobo(
        mode=mode,
        pay_frequency=pay_frequency,
        monthly_variable_pool_kobo=monthly_variable_pool_kobo,
        income_monthly_kobo=income_monthly_kobo,
        fixed_costs_monthly_kobo=fixed_costs_monthly_kobo,
        savings_rate_pct=savings_rate_pct,
    )
    daily_allowance = (cycle_pool + cycle.length_days // 2) // cycle.length_days

    spent_this_cycle = 0
    category_totals: dict[str, int] = {}
    for spent_on, amount_kobo, category in expenses:
        if (
            cycle.start <= spent_on <= cycle.end
            and category != "no_spend"
            and (mode == "log_only" or category in VARIABLE_CATEGORIES)
        ):
            spent_this_cycle += amount_kobo
            category_totals[category] = category_totals.get(category, 0) + amount_kobo

    days_left_including_today = max(1, (cycle.end - today).days + 1)
    days_to_next_payday = max(0, (cycle.next_pay_date - today).days)
    remaining_pool = max(0, cycle_pool - spent_this_cycle)
    safe_to_spend_today = remaining_pool // days_left_including_today

    if cycle_pool > 0:
        spent_percent = min(100, (spent_this_cycle * 100) // cycle_pool)
    else:
        spent_percent = 100 if spent_this_cycle > 0 else 0

    return TrackerState(
        cycle=cycle,
        cycle_pool_kobo=cycle_pool,
        daily_allowance_kobo=daily_allowance,
        spent_this_cycle_kobo=spent_this_cycle,
        remaining_pool_kobo=remaining_pool,
        days_left_including_today=days_left_including_today,
        days_to_next_payday=days_to_next_payday,
        safe_to_spend_today_kobo=safe_to_spend_today,
        spent_percent=spent_percent,
        spent_width_step=_width_step_5(spent_percent),
        category_totals_kobo=category_totals,
    )
