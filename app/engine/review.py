"""Weekly and end-of-cycle review feedback generator (kind, specific, never shaming)."""

from __future__ import annotations

from dataclasses import dataclass
from datetime import date, timedelta

from app.engine.normalize import (
    ESSENTIAL_CATEGORIES,
    VARIABLE_CATEGORIES,
    category_label,
)
from app.engine.periods import CycleBlock, PayCycle
from app.money import format_naira

WEEKLY_MESSAGES: dict[str, tuple[str, ...]] = {
    "on_track": (
        "You're doing well. You spent {spent} of your {allowance} allowance and kept {saved} in reserve. {streak_sentence}",
        "Steady week. You spent {spent} out of {allowance}, leaving {saved} unspent. {streak_sentence}",
    ),
    "close_discretionary": (
        "You're close to your limit: {spent} of {allowance}. {top_category} was the biggest part. A small trim next week keeps you on track.",
        "Almost right on target at {spent} of {allowance}. {top_category} led your spending. A slight pause there next week keeps things balanced.",
    ),
    "close_essential": (
        "You're close to your limit: {spent} of {allowance}. {top_category} was the biggest part. Planning trips or bulk buys next week keeps you on track.",
        "Right near your {allowance} allowance at {spent}, mostly from {top_category}. Checking local prices early next week helps you stay steady.",
    ),
    "over_discretionary": (
        "You went {over_by} over this week. The biggest gap was in {top_category}. Try a small adjustment there next week, or update your plan if prices have changed.",
        "This week ended {over_by} above your allowance, led by {top_category}. A small trim in that area next week helps, or adjust your plan if needed.",
    ),
    "over_essential": (
        "You went {over_by} over this week. Most of that went to {top_category}. Check local prices or update your plan if essentials now cost more.",
        "You spent {over_by} above your weekly allowance, mainly on {top_category}. If everyday prices shifted, update your plan so your targets stay realistic.",
    ),
    "low_data": (
        "You logged {days_logged} day(s) this week. Log each day — even tapping 'No spending today' — so next week's review reflects your real week.",
    ),
}


@dataclass(frozen=True)
class WeeklyReviewResult:
    """Output for one completed 7-day (or cycle-ending) block."""

    period_start: date
    period_end: date
    spent_kobo: int
    allowance_kobo: int
    ratio_bp: int
    status: str  # on_track, close, over, low_data
    message: str
    top_category: str | None
    days_logged: int
    days_under_allowance: int
    streak_days: int
    trend: str  # improving, rising, steady
    category_totals_kobo: dict[str, int]


@dataclass(frozen=True)
class MonthlyCategoryComparison:
    """Planned vs actual spend for one variable category in a pay cycle."""

    category: str
    label: str
    planned_kobo: int
    actual_kobo: int
    diff_kobo: int


@dataclass(frozen=True)
class MonthlyReviewResult:
    """End-of-cycle review summary."""

    period_start: date
    period_end: date
    spent_kobo: int
    allowance_kobo: int
    ratio_bp: int
    status: str
    leftover_kobo: int
    weeks_on_track: int
    total_weeks: int
    message: str
    comparisons: list[MonthlyCategoryComparison]


def compute_four_week_trend(ratios_bp_oldest_to_newest: list[int]) -> str:
    """Compare the last 2 weeks' average ratio to the previous 2 weeks (+/-10pp)."""
    if len(ratios_bp_oldest_to_newest) < 4:
        return "steady"
    last4 = ratios_bp_oldest_to_newest[-4:]
    prev_avg = (last4[0] + last4[1]) / 2.0
    recent_avg = (last4[2] + last4[3]) / 2.0
    diff = recent_avg - prev_avg
    if diff >= 1000:
        return "rising"
    if diff <= -1000:
        return "improving"
    return "steady"


def compute_streak_at_date(
    end_date: date,
    daily_allowance_kobo: int,
    daily_spend_map: dict[date, int],
) -> int:
    """Count consecutive logged days ending at `end_date` where spend <= daily allowance."""
    streak = 0
    cursor = end_date
    while cursor in daily_spend_map:
        if daily_spend_map[cursor] <= daily_allowance_kobo:
            streak += 1
            cursor -= timedelta(days=1)
        else:
            break
    return streak


def _select_top_category(
    mode: str,
    cat_totals: dict[str, int],
    category_allowances_block: dict[str, int],
) -> str | None:
    if not cat_totals:
        return None
    if mode == "log_only":
        return max(cat_totals.items(), key=lambda pair: (pair[1], pair[0]))[0]

    # Planner mode: category most over its block allowance; fallback to biggest spend.
    overs: list[tuple[int, str]] = []
    for cat, spent in cat_totals.items():
        allowed = category_allowances_block.get(cat, 0)
        if spent > allowed:
            overs.append((spent - allowed, cat))
    if overs:
        overs.sort(key=lambda pair: (-pair[0], pair[1]))
        return overs[0][1]
    return max(cat_totals.items(), key=lambda pair: (pair[1], pair[0]))[0]


def compute_weekly_review(
    block: CycleBlock,
    allowance_kobo: int,
    daily_allowance_kobo: int,
    expenses: list[tuple[date, int, str]],
    mode: str = "planner",
    category_allowances_block: dict[str, int] | None = None,
    prior_week_ratios_bp: list[int] | None = None,
) -> WeeklyReviewResult:
    """Compute status, metrics, streak, 4-week trend, and kind message for a block."""
    daily_spend_all: dict[date, int] = {}
    block_cat_totals: dict[str, int] = {}
    block_logged_dates: set[date] = set()
    block_spent = 0

    for spent_on, amount_kobo, category in expenses:
        if category == "no_spend":
            daily_spend_all.setdefault(spent_on, 0)
            if block.start <= spent_on <= block.end:
                block_logged_dates.add(spent_on)
            continue

        if mode == "log_only" or category in VARIABLE_CATEGORIES:
            daily_spend_all[spent_on] = daily_spend_all.get(spent_on, 0) + amount_kobo
            if block.start <= spent_on <= block.end:
                block_logged_dates.add(spent_on)
                block_spent += amount_kobo
                block_cat_totals[category] = block_cat_totals.get(category, 0) + amount_kobo

    days_logged = len(block_logged_dates)
    days_under_allowance = sum(
        1
        for d in block_logged_dates
        if daily_spend_all.get(d, 0) <= daily_allowance_kobo
    )
    streak_days = compute_streak_at_date(block.end, daily_allowance_kobo, daily_spend_all)

    if allowance_kobo > 0:
        ratio_bp = (block_spent * 10000) // allowance_kobo
    else:
        ratio_bp = 0 if block_spent == 0 else 10000

    # Status thresholds: <90% on_track, 90-100% close, >100% over, <3 days logged -> low_data
    if days_logged < 3:
        status = "low_data"
    elif allowance_kobo == 0:
        status = "on_track" if block_spent == 0 else "over"
    elif block_spent * 10000 < allowance_kobo * 9000:
        status = "on_track"
    elif block_spent <= allowance_kobo:
        status = "close"
    else:
        status = "over"

    top_cat = _select_top_category(
        mode=mode,
        cat_totals=block_cat_totals,
        category_allowances_block=category_allowances_block or {},
    )
    top_cat_label = category_label(top_cat) if top_cat else "Everyday spending"
    is_essential = top_cat in ESSENTIAL_CATEGORIES if top_cat else False

    history = list(prior_week_ratios_bp or [])
    if status != "low_data":
        history.append(ratio_bp)
    trend = compute_four_week_trend(history)

    idx_seed = block.start.toordinal()
    if status == "low_data":
        template = WEEKLY_MESSAGES["low_data"][0]
        message = template.format(days_logged=days_logged)
    elif status == "on_track":
        templates = WEEKLY_MESSAGES["on_track"]
        saved = max(0, allowance_kobo - block_spent)
        streak_sentence = (
            f"You stayed under your daily limit for {streak_days} day(s) in a row."
            if streak_days > 0
            else "Keep logging daily to build your streak."
        )
        message = templates[idx_seed % len(templates)].format(
            spent=format_naira(block_spent),
            allowance=format_naira(allowance_kobo),
            saved=format_naira(saved),
            streak_sentence=streak_sentence,
        )
    elif status == "close":
        key = "close_essential" if is_essential else "close_discretionary"
        templates = WEEKLY_MESSAGES[key]
        message = templates[idx_seed % len(templates)].format(
            spent=format_naira(block_spent),
            allowance=format_naira(allowance_kobo),
            top_category=top_cat_label,
        )
    else:
        key = "over_essential" if is_essential else "over_discretionary"
        templates = WEEKLY_MESSAGES[key]
        over_by = max(0, block_spent - allowance_kobo)
        message = templates[idx_seed % len(templates)].format(
            over_by=format_naira(over_by),
            top_category=top_cat_label,
        )

    return WeeklyReviewResult(
        period_start=block.start,
        period_end=block.end,
        spent_kobo=block_spent,
        allowance_kobo=allowance_kobo,
        ratio_bp=ratio_bp,
        status=status,
        message=message,
        top_category=top_cat,
        days_logged=days_logged,
        days_under_allowance=days_under_allowance,
        streak_days=streak_days,
        trend=trend,
        category_totals_kobo=block_cat_totals,
    )


def compute_monthly_review(
    cycle: PayCycle,
    cycle_allowance_kobo: int,
    expenses: list[tuple[date, int, str]],
    category_allowances_cycle: dict[str, int],
    weekly_statuses: list[str],
    mode: str = "planner",
) -> MonthlyReviewResult:
    """Compute end-of-cycle totals, category planned-vs-actual, and plain summary."""
    cat_actuals: dict[str, int] = {}
    total_spent = 0

    for spent_on, amount_kobo, category in expenses:
        if category == "no_spend":
            continue
        if cycle.start <= spent_on <= cycle.end and (
            mode == "log_only" or category in VARIABLE_CATEGORIES
        ):
            total_spent += amount_kobo
            cat_actuals[category] = cat_actuals.get(category, 0) + amount_kobo

    all_cats = sorted(set(category_allowances_cycle.keys()) | set(cat_actuals.keys()))
    comparisons: list[MonthlyCategoryComparison] = []
    for cat in all_cats:
        if cat not in VARIABLE_CATEGORIES and mode != "log_only":
            continue
        planned = category_allowances_cycle.get(cat, 0)
        actual = cat_actuals.get(cat, 0)
        comparisons.append(
            MonthlyCategoryComparison(
                category=cat,
                label=category_label(cat),
                planned_kobo=planned,
                actual_kobo=actual,
                diff_kobo=planned - actual,
            )
        )

    if cycle_allowance_kobo > 0:
        ratio_bp = (total_spent * 10000) // cycle_allowance_kobo
    else:
        ratio_bp = 0 if total_spent == 0 else 10000

    if cycle_allowance_kobo == 0:
        status = "on_track" if total_spent == 0 else "over"
    elif total_spent * 10000 < cycle_allowance_kobo * 9000:
        status = "on_track"
    elif total_spent <= cycle_allowance_kobo:
        status = "close"
    else:
        status = "over"

    weeks_on_track = sum(1 for st in weekly_statuses if st == "on_track")
    total_weeks = len(weekly_statuses)
    leftover_kobo = cycle_allowance_kobo - total_spent

    if leftover_kobo >= 0:
        message = (
            f"You spent {format_naira(total_spent)} of your {format_naira(cycle_allowance_kobo)} "
            f"cycle pool, finishing {format_naira(leftover_kobo)} ahead with "
            f"{weeks_on_track} of {total_weeks} week(s) on track."
        )
    else:
        message = (
            f"You spent {format_naira(total_spent)} against a {format_naira(cycle_allowance_kobo)} "
            f"cycle pool ({format_naira(abs(leftover_kobo))} over), with "
            f"{weeks_on_track} of {total_weeks} week(s) on track."
        )

    return MonthlyReviewResult(
        period_start=cycle.start,
        period_end=cycle.end,
        spent_kobo=total_spent,
        allowance_kobo=cycle_allowance_kobo,
        ratio_bp=ratio_bp,
        status=status,
        leftover_kobo=leftover_kobo,
        weeks_on_track=weeks_on_track,
        total_weeks=total_weeks,
        message=message,
        comparisons=comparisons,
    )
